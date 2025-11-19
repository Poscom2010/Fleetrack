import { useMemo, useState } from "react";
import { format } from "date-fns";
import Tabs from "../common/Tabs";

/**
 * EntryList component for displaying daily entries and expenses with filters
 * @param {Object} props
 * @param {Array} props.dailyEntries - List of daily entries
 * @param {Array} props.expenses - List of expenses
 * @param {Array} props.vehicles - List of vehicles for filtering
 * @param {Function} props.onEditEntry - Callback for editing a daily entry
 * @param {Function} props.onDeleteEntry - Callback for deleting a daily entry
 * @param {Function} props.onEditExpense - Callback for editing an expense
 * @param {Function} props.onDeleteExpense - Callback for deleting an expense
 * @param {boolean} props.isLoading - Whether data is loading
 */
const EntryList = ({
  dailyEntries = [],
  expenses = [],
  vehicles = [],
  onEditEntry,
  onDeleteEntry,
  onEditExpense,
  onDeleteExpense,
  isLoading = false,
  userRole,
}) => {
  // Only admins and managers can delete
  const canDelete = userRole === 'company_admin' || userRole === 'company_manager' || userRole === 'system_admin';
  const [activeTab, setActiveTab] = useState("entries");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle
      ? `${vehicle.name} (${vehicle.registrationNumber})`
      : "Unknown Vehicle";
  };

  const filteredEntries = useMemo(() => {
    let filtered = [...dailyEntries];
    if (selectedVehicle) {
      filtered = filtered.filter((entry) => entry.vehicleId === selectedVehicle);
    }
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((entry) => {
        const entryDate =
          entry.date instanceof Date ? entry.date : new Date(entry.date);
        return entryDate >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((entry) => {
        const entryDate =
          entry.date instanceof Date ? entry.date : new Date(entry.date);
        return entryDate <= end;
      });
    }
    return filtered;
  }, [dailyEntries, selectedVehicle, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];
    if (selectedVehicle) {
      filtered = filtered.filter(
        (expense) => expense.vehicleId === selectedVehicle
      );
    }
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((expense) => {
        const expenseDate =
          expense.date instanceof Date ? expense.date : new Date(expense.date);
        return expenseDate >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((expense) => {
        const expenseDate =
          expense.date instanceof Date ? expense.date : new Date(expense.date);
        return expenseDate <= end;
      });
    }
    return filtered;
  }, [expenses, selectedVehicle, startDate, endDate]);

  const entryTotals = useMemo(
    () =>
      filteredEntries.reduce(
        (acc, entry) => ({
          cashIn: acc.cashIn + (entry.cashIn || 0),
          distance: acc.distance + (entry.distanceTraveled || 0),
        }),
        { cashIn: 0, distance: 0 }
      ),
    [filteredEntries]
  );

  const expenseTotals = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + (expense.amount || 0), 0),
    [filteredExpenses]
  );

  const handleClearFilters = () => {
    setSelectedVehicle("");
    setStartDate("");
    setEndDate("");
  };

  const tabs = [
    { value: "entries", label: "Daily Entries", badge: filteredEntries.length },
    { value: "expenses", label: "Expenses", badge: filteredExpenses.length },
  ];

  return (
    <div className="space-y-6">
      <Tabs options={tabs} value={activeTab} onChange={setActiveTab} />

      <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="vehicleFilter"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Filter by Vehicle
            </label>
            <select
              id="vehicleFilter"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} - {vehicle.registrationNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="startDate"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
            />
          </div>
        </div>
        {(selectedVehicle || startDate || endDate) && (
          <button
            onClick={handleClearFilters}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-white/20"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-300">Loading...</div>
        ) : (
          <>
            {activeTab === "entries" && (
              <div className="space-y-4 p-6">
                {filteredEntries.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 py-10 text-center text-sm text-slate-300">
                    No daily entries found for this filter.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {filteredEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-surface-200/60 p-5 text-sm text-slate-200 shadow-soft transition hover:border-white/20 hover:bg-surface-200/80 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-base font-semibold text-white">
                                {getVehicleName(entry.vehicleId)}
                              </h3>
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                                {format(
                                  entry.date instanceof Date
                                    ? entry.date
                                    : new Date(entry.date),
                                  "MMM dd, yyyy"
                                )}
                              </span>
                              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-200">
                                {entry.distanceTraveled.toFixed(0)} km
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                              <div className="rounded-2xl bg-white/5 px-3 py-2">
                                <span className="text-slate-400">Cash-In:</span>
                                <span className="ml-2 font-semibold text-emerald-300">
                                  ${entry.cashIn.toFixed(2)}
                                </span>
                              </div>
                              <div className="rounded-2xl bg-white/5 px-3 py-2">
                                <span className="text-slate-400">Start:</span>
                                <span className="ml-2 text-white">
                                  {entry.startMileage.toFixed(1)} km
                                </span>
                              </div>
                              <div className="rounded-2xl bg-white/5 px-3 py-2">
                                <span className="text-slate-400">End:</span>
                                <span className="ml-2 text-white">
                                  {entry.endMileage.toFixed(1)} km
                                </span>
                              </div>
                              <div className="rounded-2xl bg-white/5 px-3 py-2">
                                <span className="text-slate-400">Notes:</span>
                                <span className="ml-2 text-white">
                                  {entry.notes || "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 md:flex-col">
                            <button
                              onClick={() => onEditEntry(entry)}
                              className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
                            >
                              Edit
                            </button>
                            {/* Only admins and managers can delete */}
                            {canDelete && (
                              <button
                                onClick={() => onDeleteEntry(entry.id)}
                                className="rounded-2xl border border-rose-400/30 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-400/60 hover:text-rose-100"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-100">
                      <div className="flex flex-wrap gap-4">
                        <span>
                          Total cash-in: {" "}
                          <strong className="font-semibold">
                            ${entryTotals.cashIn.toFixed(2)}
                          </strong>
                        </span>
                        <span>
                          Total distance: {" "}
                          <strong className="font-semibold">
                            {entryTotals.distance.toFixed(1)} km
                          </strong>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "expenses" && (
              <div className="space-y-4 p-6">
                {filteredExpenses.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 py-10 text-center text-sm text-slate-300">
                    No expenses captured for this filter.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {filteredExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-surface-200/60 p-5 text-sm text-slate-200 shadow-soft transition hover:border-white/20 hover:bg-surface-200/80 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-base font-semibold text-white">
                                {expense.description}
                              </h3>
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                                {getVehicleName(expense.vehicleId)}
                              </span>
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                                {format(
                                  expense.date instanceof Date
                                    ? expense.date
                                    : new Date(expense.date),
                                  "MMM dd, yyyy"
                                )}
                              </span>
                              {expense.category && (
                                <span className="rounded-full bg-rose-400/20 px-3 py-1 text-xs text-rose-100">
                                  {expense.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300">
                              Amount spent on this activity.
                            </p>
                          </div>
                          <div className="flex items-center gap-3 md:flex-col">
                            <p className="text-base font-semibold text-rose-300">
                              ${expense.amount.toFixed(2)}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => onEditExpense(expense)}
                                className="rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
                              >
                                Edit
                              </button>
                              {/* Only admins and managers can delete */}
                              {canDelete && (
                                <button
                                  onClick={() => onDeleteExpense(expense.id)}
                                  className="rounded-2xl border border-rose-400/30 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-400/60 hover:text-rose-100"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-100">
                      Total expenses: {" "}
                      <strong className="font-semibold">
                        ${expenseTotals.toFixed(2)}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EntryList;
