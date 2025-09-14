// src/components/layout/SideNav.tsx
import { NavLink } from "react-router-dom"

const linkBase =
  "flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100"
const active =
  "bg-gray-900 text-white hover:bg-gray-900"
const inactive =
  "text-gray-700"

export function SideNav() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r bg-white">
      <nav className="p-4 w-full">
        <div className="mb-6">
          <div className="text-xl font-bold">ShelfLife</div>
          <div className="text-xs text-gray-500">Your produce, on time</div>
        </div>

        <ul className="space-y-1">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : inactive}`
              }
            >
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : inactive}`
              }
            >
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
