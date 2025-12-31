import React, { useState, useEffect } from 'react';
import { Users, Shield, Key, Plus, Trash2, Edit2, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient'; // Changed from 'supabase' to 'supabaseClient'

const API_BASE = '/api';

const RBACDashboard = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenants, setTenants] = useState<{ id: number; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [permissions, setPermissions] = useState<{ id: number; key: string; description: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; email: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState<{ name?: string; id?: number; userId?: string; roleId?: string }>({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [activeTab, tenantId]);

  useEffect(() => {
    if (selectedRole && permissions.length > 0) {
      loadRolePermissions(selectedRole.id);
    }
  }, [selectedRole, permissions]);

  const getAuthToken = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      throw new Error("No active session");
    }
    return session.access_token;
  };
  const loadTenants = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        showNotification('No active session', 'error');
        return;
      }

      const res = await fetch("/api/tenants", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        showNotification(err.error || 'Failed to load tenants', 'error');
        return;
      }

      const data = await res.json();
      setTenants(data);
      
      // Auto-select first tenant
      if (data.length > 0) {
        setTenantId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      showNotification('Error loading tenants', 'error');
    }
  };


  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();

      if (activeTab === 'roles') {
        const res = await fetch(`${API_BASE}/roles?tenantId=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
        } else {
          showNotification('Failed to load roles', 'error');
        }
      } else if (activeTab === 'permissions') {
        const res = await fetch(`${API_BASE}/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPermissions(data);
        } else {
          showNotification('Failed to load permissions', 'error');
        }
      } else if (activeTab === 'users') {
        const res = await fetch(`${API_BASE}/users?tenantId=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else {
          showNotification('Failed to load users', 'error');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error loading data', 'error');
    }
    setLoading(false);
  };

  const loadRolePermissions = async (roleId: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/roles/${roleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data.map((p: any) => p.id));
      } else {
        showNotification('Failed to load role permissions', 'error');
      }
    } catch (error) {
      console.error('Error loading role permissions:', error);
    }
  };

  const showNotification = (message: string, type: string = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const openModal = (type: string, data = {}) => {
    setModalType(type);
    setFormData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setFormData({});
  };

  const handleCreateRole = async () => {
    if (!formData.name?.trim()) {
      showNotification('Role name is required', 'error');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/roles?tenantId=${tenantId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: formData.name.trim() })
      });

      if (res.ok) {
        showNotification('Role created successfully');
        closeModal();
        loadData();
      } else {
        const error = await res.json();
        showNotification(error.error || 'Failed to create role', 'error');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification('Error creating role', 'error');
    }
  };

  const handleUpdateRole = async () => {
    if (!formData.name?.trim()) {
      showNotification('Role name is required', 'error');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/roles/${formData.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: formData.name.trim() })
      });

      if (res.ok) {
        showNotification('Role updated successfully');
        closeModal();
        loadData();
        if (selectedRole?.id === formData.id) {
          setSelectedRole({ ...selectedRole, name: formData.name.trim() });
        }
      } else {
        const error = await res.json();
        showNotification(error.error || 'Failed to update role', 'error');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('Error updating role', 'error');
    }
  };

  const handleDeleteRole = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/roles/${formData.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        showNotification('Role deleted successfully');
        closeModal();
        loadData();
        if (selectedRole?.id === formData.id) {
          setSelectedRole(null);
        }
      } else {
        const error = await res.json();
        showNotification(error.error || 'Failed to delete role', 'error');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('Error deleting role', 'error');
    }
  };

  const handleAssignRole = async () => {
    if (!formData.userId || !formData.roleId) {
      showNotification('Please select both user and role', 'error');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/users/assign-role`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: tenantId,
          targetUserId: formData.userId,
          roleId: formData.roleId
        })
      });

      if (res.ok) {
        showNotification('Role assigned successfully');
        closeModal();
      } else {
        const error = await res.json();
        showNotification(error.error || 'Failed to assign role', 'error');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      showNotification('Error assigning role', 'error');
    }
  };

  const handleSubmit = () => {
    if (modalType === 'createRole') handleCreateRole();
    else if (modalType === 'editRole') handleUpdateRole();
    else if (modalType === 'deleteRole') handleDeleteRole();
    else if (modalType === 'assignRole') handleAssignRole();
  };

  const togglePermission = async (permissionId: number, isAssigned: boolean) => {
    if (!selectedRole) return;

    try {
      const token = await getAuthToken();
      if (isAssigned) {
        const res = await fetch(`${API_BASE}/permissions/remove`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tenantId: tenantId,
            roleId: selectedRole.id,
            permissionId: permissionId
          })
        });

        if (res.ok) {
          showNotification('Permission removed');
          loadRolePermissions(selectedRole.id);
        } else {
          const error = await res.json();
          showNotification(error.error || 'Failed to remove permission', 'error');
        }
      } else {
        const res = await fetch(`${API_BASE}/permissions/assign`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tenantId: tenantId,
            roleId: selectedRole.id,
            permissionId: permissionId
          })
        });

        if (res.ok) {
          showNotification('Permission assigned');
          loadRolePermissions(selectedRole.id);
        } else {
          const error = await res.json();
          showNotification(error.error || 'Failed to assign permission', 'error');
        }
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      showNotification('Error updating permission', 'error');
    }
  };

  const RoleCard = ({ role }: { role: any }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{role.name}</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => openModal('editRole', role)}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModal('deleteRole', role)}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <button
        onClick={() => setSelectedRole(role)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        Manage Permissions →
      </button>
    </div>
  );

  const PermissionBadge = ({ permission, assigned, onToggle }: { permission: any; assigned: boolean; onToggle: () => void }) => (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
        assigned
          ? 'bg-blue-50 border-blue-300'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div>
        <div className="font-medium text-sm text-gray-900">{permission.key}</div>
        <div className="text-xs text-gray-500">{permission.description}</div>
      </div>
      {assigned && <Check className="w-5 h-5 text-blue-600" />}
    </div>
  );

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">RBAC Admin</h1>
            <div className="flex items-center gap-3">
              {tenants.length > 1 && (
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
                Tenant ID: {tenantId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'roles'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'permissions'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Key className="w-4 h-4" />
            Permissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="flex-1">
              {activeTab === 'roles' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
                    <button
                      onClick={() => openModal('createRole')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Role
                    </button>
                  </div>
                  {roles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No roles found. Create your first role to get started.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {roles.map((role) => (
                        <RoleCard key={role.id} role={role} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'permissions' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">All Permissions</h2>
                  {permissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No permissions found in the system.
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {permissions.map((perm) => (
                          <div key={perm.id} className="p-4 hover:bg-gray-50">
                            <div className="font-medium text-gray-900">{perm.key}</div>
                            <div className="text-sm text-gray-500 mt-1">{perm.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Users</h2>
                    <button
                      onClick={() => openModal('assignRole')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Assign Role
                    </button>
                  </div>
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No users found in this tenant.
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {users.map((user) => (
                          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <div className="font-medium text-gray-900">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedRole && activeTab === 'roles' && permissions.length > 0 && (
              <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {selectedRole.name} Permissions
                  </h3>
                  <button
                    onClick={() => setSelectedRole(null)}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {permissions.map((perm) => (
                    <PermissionBadge
                      key={perm.id}
                      permission={perm}
                      assigned={rolePermissions.includes(perm.id)}
                      onToggle={() => togglePermission(perm.id, rolePermissions.includes(perm.id))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {modalType === 'createRole' && 'Create New Role'}
                {modalType === 'editRole' && 'Edit Role'}
                {modalType === 'deleteRole' && 'Delete Role'}
                {modalType === 'assignRole' && 'Assign Role to User'}
              </h3>

              {modalType === 'deleteRole' ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete the role "{formData.name}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {modalType === 'assignRole' ? 'User' : 'Role Name'}
                    </label>
                    {modalType === 'assignRole' ? (
                      <select
                        value={formData.userId || ''}
                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter role name"
                      />
                    )}
                  </div>
                  {modalType === 'assignRole' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={formData.roleId || ''}
                        onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {modalType === 'createRole' ? 'Create' : modalType === 'editRole' ? 'Save' : 'Assign'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RBACDashboard;
