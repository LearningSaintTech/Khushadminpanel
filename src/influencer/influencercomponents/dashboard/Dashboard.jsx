// src/influencer/Dashboard.jsx  (or wherever it lives)
import React from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";

export default function Dashboard() {
  // Mock data - replace with real API data later
  const stats = [
    {
      title: "Total Earnings",
      value: "₹24,500",
      change: "+12.4%",
      isPositive: true,
      icon: DollarSign,
    },
    {
      title: "Total Orders",
      value: "320",
      change: "+8.2%",
      isPositive: true,
      icon: ShoppingCart,
    },
    {
      title: "Referred Users",
      value: "1,245",
      change: "-3.1%",
      isPositive: false,
      icon: Users,
    },
    {
      title: "Monthly Growth",
      value: "+18%",
      change: "+5.6%",
      isPositive: true,
      icon: TrendingUp,
    },
  ];

  const recentOrders = [
    { id: "#12345", amount: "₹1,200", status: "Completed", time: "2h ago" },
    { id: "#12346", amount: "₹850",   status: "Processing", time: "5h ago" },
    { id: "#12347", amount: "₹2,400", status: "Completed", time: "1d ago" },
    { id: "#12348", amount: "₹950",   status: "Pending", time: "2d ago" },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">
            Welcome back, Prachi  ji👋
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Here's what's happening with your account today
          </p>
        </div>
        <button className="px-6 py-3 bg-black hover:bg-gray-900 text-white font-medium rounded-lg shadow-md transition-all duration-300 hover:shadow-lg active:scale-95">
          Withdraw Earnings
        </button>
      </div>

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-bold text-black mt-3">
                  {stat.value}
                </h3>
              </div>

              <div className="p-3 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                <stat.icon className="text-black" size={24} strokeWidth={2} />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1.5">
              {stat.isPositive ? (
                <ArrowUpRight className="text-gray-600" size={16} />
              ) : (
                <ArrowDownRight className="text-gray-600" size={16} />
              )}
              <span className="text-sm font-medium text-gray-700">
                {stat.change} this month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">
            Recent Orders
          </h2>
          <button className="text-black hover:text-gray-700 font-medium text-sm flex items-center gap-1 transition-colors">
            View All <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black font-semibold border border-gray-200">
                  {order.id.slice(-2)}
                </div>
                <div>
                  <p className="font-semibold text-black">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.time}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold text-black">{order.amount}</p>
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-md mt-1 bg-gray-100 text-gray-700 border border-gray-200">
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional: Add more sections like Earnings Chart, Top Referrals, etc. */}
    </div>
  );
}