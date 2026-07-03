import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './logout-button';
import styles from './dashboard.module.css';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/bank-details', label: 'Payments' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.sidebar}>
          <div className={styles.sidebarLogo}>Rabb</div>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.sidebarNavLink}>
              {item.label}
            </Link>
          ))}
          <div className={styles.sidebarSpacer}>
            <LogoutButton className={styles.sidebarNavLink} />
          </div>
        </nav>

        <div className={styles.content}>{children}</div>

        <nav className={styles.bottomNav}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
          <LogoutButton className={styles.navLink} />
        </nav>
      </div>
    </div>
  );
}
