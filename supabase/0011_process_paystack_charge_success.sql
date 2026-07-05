-- 3.3 webhook handler: atomic, idempotent charge.success processing.
--
-- Runs as ONE Postgres transaction (a single function call) so a partial
-- failure (e.g. the Node process crashing between steps) can never leave
-- a payment recorded without its order flipped, or an order flipped
-- without its stock decremented.
--
-- Idempotency: payments.paystack_reference and payments.webhook_event_id
-- are both UNIQUE (0001_schema.sql). The insert below is the actual
-- idempotency gate — a replayed webhook hits unique_violation and
-- returns a clean no-op instead of raising, BEFORE the order flip or
-- stock decrement run. This is what guarantees "replayed twice -> exactly
-- one payments row, one status flip, one stock decrement" even under
-- concurrent delivery, not just sequential retries.
--
-- Amount mismatch: if the amount Paystack actually confirms doesn't
-- match the order's total_amount, the payments row is still inserted
-- (the money was genuinely received — never lose that record) but the
-- order is NOT flipped to 'paid' and stock is NOT decremented. This
-- surfaces a real discrepancy for a human to investigate rather than
-- silently fulfilling an order for the wrong amount.
--
-- Stock decrement: a single guarded UPDATE per line item
-- (stock_quantity = stock_quantity - qty WHERE stock_quantity >= qty),
-- never read-then-write, so concurrent orders can't oversell.
--
-- Known edge case, intentionally not resolved by this function: if
-- stock is already insufficient by the time this runs (a race already
-- oversold the item), the decrement for that item is silently skipped.
-- The payment has still genuinely been received — architecture rule 4
-- says payments are immutable once successful, so it's still recorded
-- and the order still flips to 'paid'. Reconciling an oversold item
-- (refund, backorder, merchant notification) is a launch-blocking
-- policy decision tracked as PLAN.md 5.2 — this function does not
-- invent a policy for it.
create or replace function process_paystack_charge_success(
  p_paystack_reference text,
  p_webhook_event_id text,
  p_amount numeric,
  p_platform_fee numeric,
  p_merchant_amount numeric
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_item record;
  v_amount_mismatch boolean;
begin
  select * into v_order from orders where paystack_reference = p_paystack_reference;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  v_amount_mismatch := (p_amount <> v_order.total_amount);

  begin
    insert into payments (
      merchant_id, order_id, paystack_reference, webhook_event_id,
      amount, platform_fee, merchant_amount, status
    ) values (
      v_order.merchant_id, v_order.id, p_paystack_reference, p_webhook_event_id,
      p_amount, p_platform_fee, p_merchant_amount, 'successful'
    );
  exception
    when unique_violation then
      return jsonb_build_object('ok', true, 'reason', 'duplicate', 'order_id', v_order.id);
  end;

  if v_amount_mismatch then
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'order_id', v_order.id);
  end if;

  -- Guarded on current status so this is a no-op (not an error) if the
  -- order was somehow already paid/refunded/cancelled by the time we
  -- get here.
  update orders
  set status = 'paid'
  where id = v_order.id and status = 'pending';

  for v_item in
    select product_id, quantity from order_items where order_id = v_order.id
  loop
    update products
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_item.product_id and stock_quantity >= v_item.quantity;
  end loop;

  return jsonb_build_object('ok', true, 'reason', 'processed', 'order_id', v_order.id);
end;
$$;

-- Supabase auto-exposes every public-schema function as a PostgREST RPC
-- endpoint by default. Without this explicit lockdown, anon or
-- authenticated could call process_paystack_charge_success directly and
-- fabricate a fake successful payment, completely bypassing webhook
-- signature verification. Only the service role (used exclusively by
-- the webhook route handler, only after signature verification passes)
-- may execute it.
revoke execute on function process_paystack_charge_success(text, text, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function process_paystack_charge_success(text, text, numeric, numeric, numeric) to service_role;
