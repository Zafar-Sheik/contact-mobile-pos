import {
  DollarSign,
  Package,
  Users,
  Truck,
  Workflow,
  UserCog,
  Fuel,
  User,
  Menu,
  Search,
  Bell,
} from "lucide-react";
import Link from "next/link";
import BackArrow from "./components/BackArrow";
import Image from "next/image";
import Logo from "@/public/images/logo1.png";

const menuItems = [
  {
    name: "Financial Hub",
    href: "/financial-hub",
    icon: DollarSign,
    color: "bg-green-500",
  },
  {
    name: "Stock Item",
    href: "/stock-item",
    icon: Package,
    color: "bg-blue-500",
  },
  { name: "Client", href: "/client", icon: Users, color: "bg-purple-500" },
  { name: "Supplier", href: "/supplier", icon: Truck, color: "bg-orange-500" },
  {
    name: "Workflow",
    href: "/workflow",
    icon: Workflow,
    color: "bg-indigo-500",
  },
  { name: "Staff", href: "/staff", icon: UserCog, color: "bg-red-500" },
  { name: "Fuel", href: "/fuel", icon: Fuel, color: "bg-yellow-500" },
  { name: "Profile", href: "/profile", icon: User, color: "bg-pink-500" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BackArrow />
            <Image
              src={Logo}
              alt="Contact Online Solutions Logo"
              width={100}
              height={50}
              className="h-auto"
              priority={false}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Welcome Banner */}
        <div className="mb-6 bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl p-5 text-white">
          <h1 className="text-2xl font-bold mb-2">Contact Mobile POS!</h1>
          <p className="text-blue-100">Manage your POS system efficiently</p>
        </div>

        {/* Dashboard Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 active:scale-[0.98]">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`${item.color} p-3 rounded-xl mb-3`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <span className="font-medium text-gray-800">
                      {item.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Navigation - For mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around">
        <Link
          href="/financial-hub"
          className="flex flex-col items-center space-y-1">
          <DollarSign size={20} className="text-gray-600" />
          <span className="text-xs text-gray-600">Finance</span>
        </Link>

        <Link
          href="/stock-item"
          className="flex flex-col items-center space-y-1">
          <Package size={20} className="text-gray-600" />
          <span className="text-xs text-gray-600">Stock</span>
        </Link>

        <Link href="/client" className="flex flex-col items-center space-y-1">
          <Users size={20} className="text-gray-600" />
          <span className="text-xs text-gray-600">Clients</span>
        </Link>

        <Link href="/profile" className="flex flex-col items-center space-y-1">
          <User size={20} className="text-gray-600" />
          <span className="text-xs text-gray-600">Profile</span>
        </Link>
      </nav>

      {/* Padding for bottom navigation */}
      <div className="pb-20"></div>
    </div>
  );
}
