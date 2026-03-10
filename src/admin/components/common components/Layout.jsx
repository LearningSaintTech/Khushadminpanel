// layouts/Layout.jsx
import Sidebar from '../common components/sidebar'
import { Outlet } from 'react-router-dom'

const Layout = () => {
  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Page Content - offset by sidebar width on large screens */}
      <main className="flex-1 p-4 sm:p-6 lg:ml-72">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
