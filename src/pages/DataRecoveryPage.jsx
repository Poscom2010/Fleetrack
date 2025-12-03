import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getDeletedDocuments, 
  getAllDeletedDocuments,
  restoreDocument, 
  restoreBatch,
  getDeletedDataStats,
  RECOVERABLE_COLLECTIONS 
} from '../services/dataRecoveryService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { RefreshCw, Trash2, Database, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DataRecoveryPage = () => {
  const { userProfile, user } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [deletedData, setDeletedData] = useState({});
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Check if user is system admin
  const isSystemAdmin = userProfile?.role === 'system_admin';

  useEffect(() => {
    if (!isSystemAdmin) return;
    loadData();
    loadCompanies();
  }, [isSystemAdmin, selectedCompany]);

  const loadCompanies = async () => {
    try {
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      const companiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompanies(companiesList);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let data;
      if (selectedCompany === 'all') {
        data = await getAllDeletedDocuments();
      } else {
        data = await getDeletedDocuments(selectedCompany);
      }
      setDeletedData(data);

      // Calculate stats
      if (selectedCompany !== 'all') {
        const statsData = await getDeletedDataStats(selectedCompany);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading deleted data:', error);
      showMessage('Error loading deleted data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (collectionName, documentId) => {
    setActionLoading(true);
    try {
      await restoreDocument(collectionName, documentId, user.uid);
      showMessage('Item restored successfully!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error restoring item:', error);
      showMessage('Error restoring item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedItems.length === 0) return;

    setActionLoading(true);
    try {
      // Group by collection
      const byCollection = {};
      selectedItems.forEach(item => {
        if (!byCollection[item.collection]) {
          byCollection[item.collection] = [];
        }
        byCollection[item.collection].push(item.id);
      });

      // Restore each collection
      for (const [col, ids] of Object.entries(byCollection)) {
        await restoreBatch(col, ids, user.uid);
      }

      showMessage(`${selectedItems.length} items restored successfully!`, 'success');
      setSelectedItems([]);
      await loadData();
    } catch (error) {
      console.error('Error restoring items:', error);
      showMessage('Error restoring items', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectItem = (collection, id) => {
    const itemKey = `${collection}-${id}`;
    const existing = selectedItems.find(item => `${item.collection}-${item.id}` === itemKey);
    
    if (existing) {
      setSelectedItems(selectedItems.filter(item => `${item.collection}-${item.id}` !== itemKey));
    } else {
      setSelectedItems([...selectedItems, { collection, id }]);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!isSystemAdmin) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className={`text-center p-8 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Access Denied
          </h2>
          <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
            This page is only accessible to System Administrators.
          </p>
        </div>
      </div>
    );
  }

  const filteredData = selectedCollection === 'all' 
    ? deletedData 
    : { [selectedCollection]: deletedData[selectedCollection] || [] };

  const totalItems = Object.values(filteredData).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Data Recovery Center
            </h1>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Restore deleted data for companies. Only System Administrators can access this page.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Filters */}
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Collection
              </label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Collections</option>
                {RECOVERABLE_COLLECTIONS.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadData}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                Total Deleted Items: <span className="font-bold text-red-500">{stats.totalDeleted}</span>
              </p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {selectedItems.length > 0 && (
          <div className={`mb-4 p-4 rounded-lg border flex items-center justify-between ${
            isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
          }`}>
            <span className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              {selectedItems.length} item(s) selected
            </span>
            <button
              onClick={handleRestoreSelected}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Restore Selected
            </button>
          </div>
        )}

        {/* Data Display */}
        {loading ? (
          <LoadingSpinner text="Loading deleted data..." />
        ) : totalItems === 0 ? (
          <div className={`text-center py-12 rounded-lg border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <Database className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              No deleted items found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(filteredData).map(([collectionName, items]) => {
              if (items.length === 0) return null;

              return (
                <div key={collectionName} className={`rounded-lg border ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="p-4 border-b border-slate-700">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {collectionName} ({items.length})
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDark ? 'bg-slate-900' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newItems = items.map(item => ({ collection: collectionName, id: item.id }));
                                  setSelectedItems([...selectedItems, ...newItems]);
                                } else {
                                  setSelectedItems(selectedItems.filter(item => item.collection !== collectionName));
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            ID
                          </th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            Deleted At
                          </th>
                          <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            Deleted By
                          </th>
                          <th className={`px-4 py-3 text-right text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedItems.some(si => si.collection === collectionName && si.id === item.id)}
                                onChange={() => toggleSelectItem(collectionName, item.id)}
                                className="rounded"
                              />
                            </td>
                            <td className={`px-4 py-3 text-sm font-mono ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                              {item.id.substring(0, 8)}...
                            </td>
                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              {item.deletedAt?.toLocaleString() || 'N/A'}
                            </td>
                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              {item.deletedBy?.substring(0, 8) || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRestore(collectionName, item.id)}
                                disabled={actionLoading}
                                className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 ml-auto"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataRecoveryPage;
