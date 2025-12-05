import {
  FileText,
  CreditCard,
  File,
  Truck,
  Package,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import BackArrow from "../components/BackArrow";

const financialModules = [
  {
    name: "Invoice",
    href: "/invoice",
    icon: FileText,
    color: "bg-blue-500",
    description: "Create and manage invoices",
  },
  {
    name: "Payment",
    href: "/payment",
    icon: CreditCard,
    color: "bg-green-500",
    description: "Process customer payments",
  },
  {
    name: "Quote",
    href: "/quote",
    icon: File,
    color: "bg-purple-500",
    description: "Generate quotations",
  },
  {
    name: "Supplier Payment",
    href: "/supplier-payment",
    icon: Truck,
    color: "bg-orange-500",
    description: "Manage supplier payments",
  },
  {
    name: "GRV",
    href: "/grv",
    icon: Package,
    color: "bg-indigo-500",
    description: "Goods Received Vouchers",
  },
];

export default function FinancialHub() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center space-x-4">
          <BackArrow />
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Financial Hub
            </h1>
            <p className="text-sm text-gray-500">
              Manage all financial operations
            </p>
          </div>
        </div>
      </header>

      <main className="p-4">
        {/* Quick Actions */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <Link
            href="/invoice"
            className="shrink-0 flex items-center space-x-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText size={18} />
            <span className="text-sm font-medium">New Invoice</span>
          </Link>

          <Link
            href="/payment"
            className="shrink-0 flex items-center space-x-2 px-4 py-3 bg-green-50 text-green-600 rounded-lg">
            <CreditCard size={18} />
            <span className="text-sm font-medium">Receive Payment</span>
          </Link>
        </div>

        {/* Financial Modules Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Financial Modules
          </h2>

          <div className="space-y-3">
            {financialModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.name}
                  href={module.href}
                  className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm hover:shadow transition-all duration-200 active:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`${module.color} p-3 rounded-xl`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {module.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around">
        <Link
          href="/financial-hub"
          className="flex flex-col items-center space-y-1">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Package size={20} className="text-blue-600" />
          </div>
          <span className="text-xs text-blue-600 font-medium">Finance</span>
        </Link>

        <Link href="/invoice" className="flex flex-col items-center space-y-1">
          <FileText size={20} className="text-gray-400" />
          <span className="text-xs text-gray-400">Invoice</span>
        </Link>

        <Link href="/payment" className="flex flex-col items-center space-y-1">
          <CreditCard size={20} className="text-gray-400" />
          <span className="text-xs text-gray-400">Payment</span>
        </Link>

        <Link href="/grv" className="flex flex-col items-center space-y-1">
          <Truck size={20} className="text-gray-400" />
          <span className="text-xs text-gray-400">GRV</span>
        </Link>
      </nav>

      {/* Padding for bottom navigation */}
      <div className="pb-20"></div>
    </div>
  );
}
