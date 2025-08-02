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
import { Calendar, Plus, Trash2, Calculator, TrendingUp, Wallet, DollarSign } from "lucide-react";
import { Calendar as CalendarComponent } from "./components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentReport, setCurrentReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", pin: "" });
  const [showLogin, setShowLogin] = useState(true);

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
    } catch (error) {
      alert("Invalid credentials");
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
              <Button variant="outline" onClick={() => setShowLogin(true)}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    </div>
  );
}

export default App;