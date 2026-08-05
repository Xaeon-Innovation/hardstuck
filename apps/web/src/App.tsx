import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppShell, PublicLayout } from './components/Layouts';
import { HomePage } from './pages/HomePage';
import { LoginPage, RegisterPage, VerifyEmailPage } from './pages/AuthPages';
import {
  NewOrderPage,
  OrdersListPage,
  OrderDetailPage,
  PaymentCompletePage,
} from './pages/OrderPages';
import {
  ClientDashboard,
  BoosterDashboard,
  AdminOverview,
  AdminUsers,
  AdminOrders,
  AdminPayments,
} from './pages/Dashboards';
import { getStoredUser } from './lib/api';

function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function OrderDetailRoute() {
  const { id } = useParams();
  return <OrderDetailPage orderId={id!} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="order/new" element={<NewOrderPage />} />
        <Route path="payment/complete" element={<PaymentCompletePage />} />
      </Route>

      <Route
        path="app"
        element={
          <RequireAuth roles={['client', 'admin']}>
            <AppShell
              title="Client"
              links={[
                { to: '/app', label: 'Overview' },
                { to: '/app/orders', label: 'Orders' },
                { to: '/order/new', label: 'New order' },
              ]}
            />
          </RequireAuth>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route path="orders" element={<OrdersListPage />} />
        <Route path="orders/:id" element={<OrderDetailRoute />} />
      </Route>

      <Route
        path="booster"
        element={
          <RequireAuth roles={['booster', 'admin']}>
            <AppShell
              title="Booster"
              links={[
                { to: '/booster', label: 'Dashboard' },
                { to: '/booster/queue', label: 'Queue' },
              ]}
            />
          </RequireAuth>
        }
      >
        <Route index element={<BoosterDashboard />} />
        <Route path="queue" element={<BoosterDashboard />} />
      </Route>

      <Route
        path="admin"
        element={
          <RequireAuth roles={['admin', 'mod']}>
            <AppShell
              title="Admin"
              links={[
                { to: '/admin', label: 'Overview' },
                { to: '/admin/users', label: 'Users' },
                { to: '/admin/orders', label: 'Orders' },
                { to: '/admin/payments', label: 'Payments' },
              ]}
            />
          </RequireAuth>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
      </Route>
    </Routes>
  );
}
