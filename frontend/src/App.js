import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Calendar, Plus, Trash2, Calculator, TrendingUp, Wallet, DollarSign, Users, BarChart3, Settings, History, PieChart } from "lucide-react";
import { Calendar as CalendarComponent } from "./components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentReport, setCurrentReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", pin: "" });
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newUser, setNewUser] = useState({ username: "", pin: "", is_admin: false });
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Form state for daily report
  const [reportForm, setReportForm] = useState({
    pos_profit: 0,
    employee_payout: 650,
    government_expense: 200,
    product_expenses: [],
    other_expenses: []
  });

  const formatTMT = (amount) => {
    return `${parseFloat(amount || 0).toFixed(2)} TMT`;
  };

  const formatDate = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API}/login`, loginForm);
      setUser(response.data.user);
      setShowLogin(false);
      await loadReports();
      if (response.data.user.is_admin) {
        await loadUsers();
      }
    } catch (error) {
      alert("Invalid credentials");
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const createUser = async () => {
    try {
      await axios.post(`${API}/users`, newUser);
      await loadUsers();
      setNewUser({ username: "", pin: "", is_admin: false });
      setShowCreateUser(false);
      alert("User created successfully!");
    } catch (error) {
      alert("Error creating user: " + (error.response?.data?.detail || "Unknown error"));
    }
  };

  const loadReports = async () => {
    try {
      const response = await axios.get(`${API}/reports`);
      setReports(response.data);
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  };

  const loadReportForDate = async (date) => {
    try {
      setLoading(true);
      const dateStr = formatDate(date);
      const response = await axios.get(`${API}/reports/${dateStr}`);
      setCurrentReport(response.data);
      setReportForm({
        pos_profit: response.data.pos_profit,
        employee_payout: response.data.employee_payout,
        government_expense: response.data.government_expense,
        product_expenses: response.data.product_expenses,
        other_expenses: response.data.other_expenses
      });
    } catch (error) {
      // No report exists for this date
      setCurrentReport(null);
      setReportForm({
        pos_profit: 0,
        employee_payout: 650,
        government_expense: 200,
        product_expenses: [],
        other_expenses: []
      });
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    try {
      setLoading(true);
      const dateStr = formatDate(selectedDate);
      const reportData = {
        ...reportForm,
        date: dateStr,
        created_by: user.username
      };

      let response;
      if (currentReport) {
        response = await axios.put(`${API}/reports/${dateStr}`, reportData);
      } else {
        response = await axios.post(`${API}/reports`, reportData);
      }

      setCurrentReport(response.data);
      await loadReports();
      alert("Report saved successfully!");
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Error saving report");
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportDate) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    
    try {
      await axios.delete(`${API}/reports/${reportDate}`);
      await loadReports();
      alert("Report deleted successfully!");
    } catch (error) {
      alert("Error deleting report");
    }
  };

  const addExpenseItem = (type) => {
    const newItem = { id: Date.now().toString(), title: "", amount: 0 };
    setReportForm(prev => ({
      ...prev,
      [type]: [...prev[type], newItem]
    }));
  };

  const removeExpenseItem = (type, index) => {
    setReportForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateExpenseItem = (type, index, field, value) => {
    setReportForm(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => 
        i === index ? { ...item, [field]: field === 'amount' ? parseFloat(value || 0) : value } : item
      )
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const productTotal = reportForm.product_expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const otherTotal = reportForm.other_expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = reportForm.employee_payout + reportForm.government_expense + productTotal + otherTotal;
    const cashInRegister = reportForm.pos_profit;
    const remainingBalance = reportForm.pos_profit - totalExpenses;
    const excess = cashInRegister - remainingBalance > 0 ? cashInRegister - remainingBalance : 0;

    return {
      totalExpenses,
      cashInRegister,
      remainingBalance,
      excess
    };
  };

  const totals = calculateTotals();

  // Analytics calculations
  const getAnalytics = () => {
    if (reports.length === 0) return null;

    const totalProfit = reports.reduce((sum, report) => sum + report.pos_profit, 0);
    const totalExpenses = reports.reduce((sum, report) => sum + report.total_expenses, 0);
    const totalBalance = reports.reduce((sum, report) => sum + report.remaining_balance, 0);
    const averageProfit = totalProfit / reports.length;
    const averageExpenses = totalExpenses / reports.length;

    // Last 7 days data
    const last7Days = reports
      .filter(report => {
        const reportDate = new Date(report.date);
        const sevenDaysAgo = subDays(new Date(), 7);
        return reportDate >= sevenDaysAgo;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // This month data
    const thisMonth = reports
      .filter(report => {
        const reportDate = new Date(report.date);
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        return reportDate >= monthStart && reportDate <= monthEnd;
      });

    const monthlyProfit = thisMonth.reduce((sum, report) => sum + report.pos_profit, 0);
    const monthlyExpenses = thisMonth.reduce((sum, report) => sum + report.total_expenses, 0);
    const monthlyBalance = monthlyProfit - monthlyExpenses;

    return {
      totalReports: reports.length,
      totalProfit,
      totalExpenses,
      totalBalance,
      averageProfit,
      averageExpenses,
      last7Days,
      monthlyProfit,
      monthlyExpenses,
      monthlyBalance,
      thisMonth
    };
  };

  const analytics = getAnalytics();

  useEffect(() => {
    if (selectedDate && user) {
      loadReportForDate(selectedDate);
    }
  }, [selectedDate, user]);

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Jadygoy Cafe</CardTitle>
            <CardDescription>Daily Expense Management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={loginForm.pin}
                onChange={(e) => setLoginForm(prev => ({ ...prev, pin: e.target.value }))}
                placeholder="Enter PIN"
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={!loginForm.username || !loginForm.pin}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Jadygoy Cafe</h1>
                <p className="text-sm text-slate-600">Daily Expense Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Welcome, {user?.username}</Badge>
              {user?.is_admin && <Badge variant="outline">Admin</Badge>}
              <Button variant="outline" onClick={() => setShowLogin(true)}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">
              <Calculator className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            {user?.is_admin && (
              <TabsTrigger value="admin">
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Date Selection */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Select Date</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(selectedDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {/* Summary Cards */}
                    <div className="mt-6 space-y-3">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700">POS Profit</span>
                          <span className="text-lg font-bold text-green-800">{formatTMT(reportForm.pos_profit)}</span>
                        </div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-red-700">Total Expenses</span>
                          <span className="text-lg font-bold text-red-800">{formatTMT(totals.totalExpenses)}</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700">Balance</span>
                          <span className={`text-lg font-bold ${totals.remainingBalance >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                            {formatTMT(totals.remainingBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Report - {format(selectedDate, "PPP")}</CardTitle>
                    <CardDescription>
                      Enter your daily expenses and POS profit data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* POS Profit */}
                    <div className="space-y-2">
                      <Label htmlFor="pos_profit" className="text-base font-semibold">POS Profit (TMT)</Label>
                      <Input
                        id="pos_profit"
                        type="number"
                        step="0.01"
                        value={reportForm.pos_profit}
                        onChange={(e) => setReportForm(prev => ({ ...prev, pos_profit: parseFloat(e.target.value || 0) }))}
                        className="text-lg"
                      />
                    </div>

                    <Separator />

                    {/* Fixed Expenses */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-800">Fixed Expenses</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="employee_payout">Employee Salary (TMT)</Label>
                          <Input
                            id="employee_payout"
                            type="number"
                            step="0.01"
                            value={reportForm.employee_payout}
                            onChange={(e) => setReportForm(prev => ({ ...prev, employee_payout: parseFloat(e.target.value || 0) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="government_expense">Government Expenses (TMT)</Label>
                          <Input
                            id="government_expense"
                            type="number"
                            step="0.01"
                            value={reportForm.government_expense}
                            onChange={(e) => setReportForm(prev => ({ ...prev, government_expense: parseFloat(e.target.value || 0) }))}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Dynamic Expenses */}
                    <Tabs defaultValue="products" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="products">Product Expenses</TabsTrigger>
                        <TabsTrigger value="other">Other Expenses</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="products" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Product Expenses</h4>
                          <Button 
                            onClick={() => addExpenseItem('product_expenses')} 
                            size="sm"
                            className="flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Item</span>
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {reportForm.product_expenses.map((item, index) => (
                            <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <Input
                                placeholder="Item name"
                                value={item.title}
                                onChange={(e) => updateExpenseItem('product_expenses', index, 'title', e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => updateExpenseItem('product_expenses', index, 'amount', e.target.value)}
                                className="w-32"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeExpenseItem('product_expenses', index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {reportForm.product_expenses.length === 0 && (
                            <p className="text-slate-500 text-center py-4">No product expenses added</p>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="other" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Other Expenses</h4>
                          <Button 
                            onClick={() => addExpenseItem('other_expenses')} 
                            size="sm"
                            className="flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Item</span>
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {reportForm.other_expenses.map((item, index) => (
                            <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <Input
                                placeholder="Expense description"
                                value={item.title}
                                onChange={(e) => updateExpenseItem('other_expenses', index, 'title', e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => updateExpenseItem('other_expenses', index, 'amount', e.target.value)}
                                className="w-32"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeExpenseItem('other_expenses', index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {reportForm.other_expenses.length === 0 && (
                            <p className="text-slate-500 text-center py-4">No other expenses added</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>

                    <Separator />

                    {/* Calculated Results */}
                    <div className="bg-slate-50 p-6 rounded-lg space-y-4">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">Total Expenses</p>
                              <p className="text-xl font-bold text-red-600">{formatTMT(totals.totalExpenses)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Wallet className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">Cash in Register</p>
                              <p className="text-xl font-bold text-blue-600">{formatTMT(totals.cashInRegister)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              totals.remainingBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              <DollarSign className={`h-5 w-5 ${
                                totals.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">Remaining Balance</p>
                              <p className={`text-xl font-bold ${
                                totals.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatTMT(totals.remainingBalance)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Plus className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600">Excess</p>
                              <p className="text-xl font-bold text-purple-600">{formatTMT(totals.excess)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={saveReport} 
                        disabled={loading}
                        className="px-8 py-2 text-lg"
                      >
                        {loading ? 'Saving...' : currentReport ? 'Update Report' : 'Save Report'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                    <History className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalReports}</div>
                    <p className="text-xs text-muted-foreground">Days tracked</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatTMT(analytics.totalProfit)}</div>
                    <p className="text-xs text-muted-foreground">Avg: {formatTMT(analytics.averageProfit)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatTMT(analytics.totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground">Avg: {formatTMT(analytics.averageExpenses)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${analytics.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatTMT(analytics.totalBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>This Month Summary</CardTitle>
                    <CardDescription>{analytics.thisMonth.length} days recorded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Monthly Profit:</span>
                        <span className="text-lg font-bold text-green-600">{formatTMT(analytics.monthlyProfit)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Monthly Expenses:</span>
                        <span className="text-lg font-bold text-red-600">{formatTMT(analytics.monthlyExpenses)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">Monthly Balance:</span>
                        <span className={`text-xl font-bold ${analytics.monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatTMT(analytics.monthlyBalance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Performance</CardTitle>
                    <CardDescription>Last 7 days trend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.last7Days.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.last7Days.slice(-5).map((report) => (
                          <div key={report.date} className="flex justify-between items-center">
                            <span className="text-sm">{format(new Date(report.date), 'MMM dd')}</span>
                            <div className="flex space-x-4">
                              <span className="text-sm text-green-600">{formatTMT(report.pos_profit)}</span>
                              <span className="text-sm text-red-600">-{formatTMT(report.total_expenses)}</span>
                              <span className={`text-sm font-medium ${report.remaining_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatTMT(report.remaining_balance)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">No recent data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <CardDescription>All daily reports and their details</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>POS Profit</TableHead>
                      <TableHead>Total Expenses</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Created By</TableHead>
                      {user?.is_admin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.date}>
                        <TableCell>{format(new Date(report.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-green-600 font-medium">{formatTMT(report.pos_profit)}</TableCell>
                        <TableCell className="text-red-600 font-medium">{formatTMT(report.total_expenses)}</TableCell>
                        <TableCell className={`font-medium ${report.remaining_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatTMT(report.remaining_balance)}
                        </TableCell>
                        <TableCell>{report.created_by}</TableCell>
                        {user?.is_admin && (
                          <TableCell>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => deleteReport(report.date)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {reports.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No reports found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {user?.is_admin && (
            <TabsContent value="admin" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>User Management</span>
                      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add User
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>Add a new user to the system</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="new-username">Username</Label>
                              <Input
                                id="new-username"
                                value={newUser.username}
                                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="Enter username"
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-pin">4-Digit PIN</Label>
                              <Input
                                id="new-pin"
                                type="password"
                                maxLength={4}
                                value={newUser.pin}
                                onChange={(e) => setNewUser(prev => ({ ...prev, pin: e.target.value }))}
                                placeholder="Enter PIN"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="new-admin"
                                checked={newUser.is_admin}
                                onChange={(e) => setNewUser(prev => ({ ...prev, is_admin: e.target.checked }))}
                              />
                              <Label htmlFor="new-admin">Admin privileges</Label>
                            </div>
                            <Button onClick={createUser} className="w-full">
                              Create User
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                    <CardDescription>Manage system users and permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{u.username}</p>
                              <p className="text-sm text-slate-500">
                                {u.is_admin ? 'Administrator' : 'Employee'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {u.is_admin && <Badge variant="secondary">Admin</Badge>}
                            <Badge variant="outline">PIN: ****</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Statistics</CardTitle>
                    <CardDescription>Overview of system usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Users:</span>
                        <span className="text-lg font-bold">{users.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Admin Users:</span>
                        <span className="text-lg font-bold">{users.filter(u => u.is_admin).length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Reports:</span>
                        <span className="text-lg font-bold">{reports.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Active Days:</span>
                        <span className="text-lg font-bold">{reports.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;