'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  MapPin,
  MessageSquare,
  X,
  Play,
  Pause,
  Check,
  XCircle
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  orderType: 'pickup' | 'delivery';
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  total: number;
  currency: string;
  items: OrderItem[];
  specialInstructions?: string;
  createdAt: string;
  estimatedTime?: string;
  progress?: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifications?: string;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-1847',
    customerName: 'Emma L.',
    customerPhone: '+46 70 123 4567',
    orderType: 'pickup',
    status: 'pending',
    total: 285,
    currency: 'SEK',
    items: [
      { name: 'Margherita Pizza', quantity: 2, price: 120, modifications: 'Extra cheese, No olives' },
      { name: 'Garlic Bread', quantity: 1, price: 45 }
    ],
    specialInstructions: 'Please make pizza extra crispy',
    createdAt: '18 min ago',
    estimatedTime: '5 min'
  },
  {
    id: '2',
    orderNumber: 'ORD-1846',
    customerName: 'John D.',
    customerPhone: '+46 70 987 6543',
    customerAddress: 'Sveavägen 123, Stockholm',
    orderType: 'delivery',
    status: 'preparing',
    total: 420,
    currency: 'SEK',
    items: [
      { name: 'Pasta Carbonara + Caesar Salad + Tiramisu', quantity: 3, price: 420 }
    ],
    createdAt: '25 min ago',
    estimatedTime: '15 min',
    progress: 65
  },
  {
    id: '3',
    orderNumber: 'ORD-1845',
    customerName: 'Sarah K.',
    customerPhone: '+46 70 555 1234',
    orderType: 'pickup',
    status: 'ready',
    total: 195,
    currency: 'SEK',
    items: [
      { name: 'Caprese Salad + Focaccia', quantity: 2, price: 195 }
    ],
    specialInstructions: 'Customer notified via SMS',
    createdAt: 'Ready 8 min ago'
  }
];

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  preparing: { label: 'Preparing', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  ready: { label: 'Ready', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' }
};

const orderTypeConfig = {
  pickup: { label: 'Pickup', icon: '🚶', bg: 'bg-yellow-100', color: 'text-yellow-700' },
  delivery: { label: 'Delivery', icon: '🚗', bg: 'bg-blue-100', color: 'text-blue-700' }
};

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');

  const filteredOrders = mockOrders.filter(order => {
    const matchesStatus = activeFilter === 'all' || order.status === activeFilter;
    const matchesType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusCount = (status: string) => {
    return mockOrders.filter(order => order.status === status).length;
  };

  const handleOrderAction = (orderId: string, action: string) => {
    console.log(`Order ${orderId}: ${action}`);
    // TODO: Implement actual order actions
  };

  // Update dashboard header and navigation when component mounts
  useEffect(() => {
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const ordersNav = document.getElementById('nav-orders');
    
    if (pageTitle) pageTitle.textContent = 'Order Management';
    if (pageSubtitle) pageSubtitle.textContent = 'Manage and track all restaurant orders in real-time';
    
    // Highlight orders navigation
    if (ordersNav) {
      ordersNav.classList.add('bg-blue-50', 'text-blue-700');
      ordersNav.classList.remove('text-gray-600');
    }
    
    // Cleanup function to remove highlighting when component unmounts
    return () => {
      if (ordersNav) {
        ordersNav.classList.remove('bg-blue-50', 'text-blue-700');
        ordersNav.classList.add('text-gray-600');
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Orders</div>
            <div className="w-5 h-5 bg-yellow-100 text-yellow-600 rounded flex items-center justify-center text-xs">⏳</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">{getStatusCount('pending')}</div>
          <div className="text-xs text-yellow-600">+2 in last hour</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Preparing</div>
            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">🔥</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">{getStatusCount('preparing')}</div>
          <div className="text-xs text-gray-600">Avg 12 min</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ready</div>
            <div className="w-5 h-5 bg-green-100 text-green-600 rounded flex items-center justify-center text-xs">✅</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">{getStatusCount('ready')}</div>
          <div className="text-xs text-gray-600">Pickup waiting</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Today</div>
            <div className="w-5 h-5 bg-purple-100 text-purple-600 rounded flex items-center justify-center text-xs">🎉</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 mb-1">24</div>
          <div className="text-xs text-gray-600">2,450 SEK total</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 All Orders
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            ⏳ Pending ({getStatusCount('pending')})
          </button>
          <button
            onClick={() => setActiveFilter('preparing')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'preparing'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            🔥 Preparing ({getStatusCount('preparing')})
          </button>
          <button
            onClick={() => setActiveFilter('ready')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'ready'
                ? 'bg-green-500 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            ✅ Ready ({getStatusCount('ready')})
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by order type"
          >
            <option value="all">All Types</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span>Live updates enabled</span>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const status = statusConfig[order.status];
          const orderType = orderTypeConfig[order.orderType];
          const StatusIcon = status.icon;

          return (
            <div
              key={order.id}
              className={`bg-white border rounded-lg p-4 transition-all hover:shadow-md ${
                order.status === 'pending' ? 'border-l-4 border-l-red-500' :
                order.status === 'preparing' ? 'border-l-4 border-l-blue-500' :
                order.status === 'ready' ? 'border-l-4 border-l-green-500' :
                'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${orderType.bg} ${orderType.color}`}>
                      {orderType.icon} {orderType.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Ordered {order.createdAt} • {order.customerName}</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{order.customerPhone}</span>
                    </div>
                    {order.customerAddress && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{order.customerAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-semibold text-gray-900 mb-1">
                    {order.total} {order.currency}
                  </div>
                  {order.estimatedTime && (
                    <div className="text-sm text-gray-600">
                      Due: {order.estimatedTime}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar for Preparing Orders */}
              {order.status === 'preparing' && order.progress && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${order.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{order.progress}% complete</div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.modifications && (
                        <div className="text-sm text-gray-600">{item.modifications}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                        {item.quantity}x
                      </span>
                      <span className="font-medium text-gray-900">{item.price} {order.currency}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                                         <div className="text-sm text-blue-800 italic">
                       &quot;{order.specialInstructions}&quot;
                     </div>
                  </div>
                </div>
              )}

              {/* Order Actions */}
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleOrderAction(order.id, 'start')}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </button>
                    <button
                      onClick={() => handleOrderAction(order.id, 'call')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </button>
                    <button
                      onClick={() => handleOrderAction(order.id, 'cancel')}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                )}

                {order.status === 'preparing' && (
                  <>
                    <button
                      onClick={() => handleOrderAction(order.id, 'ready')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Ready
                    </button>
                    <button
                      onClick={() => handleOrderAction(order.id, 'pause')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                    <button
                      onClick={() => handleOrderAction(order.id, 'cancel')}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                )}

                {order.status === 'ready' && (
                  <>
                    <button
                      onClick={() => handleOrderAction(order.id, 'complete')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      🎉 Complete
                    </button>
                    <button
                      onClick={() => handleOrderAction(order.id, 'call')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Link
          href="/dashboard/orders/new"
          className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>

             {/* Empty State */}
       {filteredOrders.length === 0 && (
         <div className="text-center py-12">
           <div className="text-gray-400 text-6xl mb-4">📦</div>
           <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
           <p className="text-gray-600 mb-4">
             {searchQuery || activeFilter !== 'all' || orderTypeFilter !== 'all'
               ? 'Try adjusting your filters or search terms'
               : 'Orders will appear here when customers place them'}
           </p>
           <Link
             href="/dashboard/orders/new"
             className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
           >
             <Plus className="h-4 w-4" />
             Create Test Order
           </Link>
         </div>
       )}

     </div>
   );
 }
