'use client';

import { useState } from 'react';
import { advancedReportsService } from '@/services/advanced-reports.service';
import { BarChart3, Users, TrendingUp, Download, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdvancedReportsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'employee' | 'customer' | 'profit'>('employee');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [employeeData, setEmployeeData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);

  const loadEmployeeReport = async () => {
    try {
      setLoading(true);
      const data = await advancedReportsService.getEmployeePerformance(dateRange);
      setEmployeeData(data);
    } catch (error: any) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load employee report');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerReport = async () => {
    try {
      setLoading(true);
      const data = await advancedReportsService.getCustomerAnalytics(dateRange);
      setCustomerData(data);
    } catch (error: any) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load customer report');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitReport = async () => {
    try {
      setLoading(true);
      const data = await advancedReportsService.getProfitLoss(dateRange);
      setProfitData(data);
    } catch (error: any) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load profit & loss report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    switch (activeTab) {
      case 'employee':
        loadEmployeeReport();
        break;
      case 'customer':
        loadCustomerReport();
        break;
      case 'profit':
        loadProfitReport();
        break;
    }
  };

  const handleExport = async () => {
    try {
      const blob = await advancedReportsService.exportReport(activeTab, dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report-${dateRange.startDate}-${dateRange.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report exported');
    } catch (error: any) {
      console.error('Failed to export:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advanced Reports</h1>
        <p className="text-gray-600 mt-1">Detailed analytics and insights</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('employee')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'employee'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Employee Performance
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'customer'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Customer Analytics
            </button>
            <button
              onClick={() => setActiveTab('profit')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'profit'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Profit & Loss
            </button>
          </nav>
        </div>

        {/* Date Range & Actions */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Generate
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {activeTab === 'employee' && (
                <EmployeePerformanceReport data={employeeData} />
              )}
              {activeTab === 'customer' && (
                <CustomerAnalyticsReport data={customerData} />
              )}
              {activeTab === 'profit' && (
                <ProfitLossReport data={profitData} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeePerformanceReport({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No employee data available. Generate a report to see results.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Transaction</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((employee, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{employee.employeeName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm text-gray-900">Rp {employee.totalSales?.toLocaleString() || 0}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm text-gray-900">{employee.totalTransactions || 0}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm text-gray-900">Rp {employee.averageTransactionValue?.toLocaleString() || 0}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerAnalyticsReport({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No customer data available. Generate a report to see results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-indigo-50 rounded-lg p-6">
          <p className="text-sm text-indigo-600 font-medium">Total Customers</p>
          <p className="text-3xl font-bold text-indigo-900 mt-2">{data.totalCustomers || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <p className="text-sm text-green-600 font-medium">New Customers</p>
          <p className="text-3xl font-bold text-green-900 mt-2">{data.newCustomers || 0}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-6">
          <p className="text-sm text-blue-600 font-medium">Returning Customers</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">{data.returningCustomers || 0}</p>
        </div>
      </div>

      {data.topCustomers && data.topCustomers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Top Customers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Visits</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topCustomers.map((customer: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">Rp {customer.totalSpent?.toLocaleString() || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">{customer.visitCount || 0}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfitLossReport({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No profit & loss data available. Generate a report to see results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="text-lg font-semibold text-gray-900">Revenue</span>
            <span className="text-lg font-bold text-green-600">
              Rp {data.revenue?.toLocaleString() || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cost of Goods Sold (COGS)</span>
            <span className="text-gray-900">Rp {data.cogs?.toLocaleString() || 0}</span>
          </div>
          
          <div className="flex justify-between items-center pb-4 border-b">
            <span className="font-semibold text-gray-900">Gross Profit</span>
            <span className="font-bold text-gray-900">
              Rp {data.grossProfit?.toLocaleString() || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Operating Expenses</span>
            <span className="text-gray-900">Rp {data.expenses?.toLocaleString() || 0}</span>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
            <span className="text-xl font-bold text-gray-900">Net Profit</span>
            <span className={`text-xl font-bold ${
              (data.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Rp {data.netProfit?.toLocaleString() || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-gray-600">Profit Margin</span>
            <span className="text-sm font-semibold text-gray-900">
              {data.profitMargin?.toFixed(2) || 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
