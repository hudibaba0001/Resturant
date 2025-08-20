'use client';

import { useState } from 'react';
import { Search, Filter, CheckCircle } from 'lucide-react';

interface Order {
  id: string;
  created_at: string;
  type: 'pickup' | 'dine_in';
  status: 'pending' | 'paid' | 'cancelled';
  order_code: string;
  total_cents: number;
  currency: string;
}

interface OrdersListProps {
  orders: Order[];
  restaurantId: string;
}

export default function OrdersList({ orders, restaurantId }: OrdersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkPaid = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId })
      });

      if (response.ok) {
        // Refresh the page to get updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error marking order as paid:', error);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      pickup: { color: 'bg-blue-100 text-blue-800', label: 'Pickup' },
      dine_in: { color: 'bg-purple-100 text-purple-800', label: 'Dine-in' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.pickup;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by order code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredOrders.map((order) => (
            <li key={order.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Order #{order.order_code}
                    </h3>
                    {getStatusBadge(order.status)}
                    {getTypeBadge(order.type)}
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{formatDate(order.created_at)}</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(order.total_cents, order.currency)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleMarkPaid(order.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      aria-label="Mark as paid"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

