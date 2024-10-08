import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { Menu } from '../components/Menu';

export const Route = createRootRoute({
  component: () => (
    <>
      <Header />
      <Outlet />
      <Menu />
    </>
  ),
});
