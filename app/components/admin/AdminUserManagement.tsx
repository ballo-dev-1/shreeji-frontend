'use client'

import { useState, useEffect } from 'react'
import Layout from './Layout'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon,
  TrashIcon,
  UserIcon,
  ShieldCheckIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import api from '@/app/lib/admin/api'
import toast from 'react-hot-toast'
import { TableSkeleton } from '@/app/components/ui/Skeletons'
import { useAuth } from '@/app/contexts/AuthContext'

interface AdminUser {
  id: number
  email: string
  firstName?: string
  lastName?: string
  role: 'super_admin' | 'manager' | 'support'
  isActive: boolean
  lastLogin?: string
  createdAt?: string
}

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  support: 'Support'
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  support: 'bg-green-100 text-green-800'
}

export default function AdminUserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'manager' | 'support'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.getAdminUsers({ 
        pagination: { page: 1, pageSize: 100 }
      })
      setUsers(response.data || [])
    } catch (error: any) {
      console.error('Error fetching admin users:', error)
      toast.error(error.message || 'Failed to load admin users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.isActive)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.isActive)
    }

    setFilteredUsers(filtered)
  }

  const handleAdd = () => {
    setEditingUser(null)
    setShowModal(true)
  }

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this admin user?')) {
      return
    }

    try {
      await api.deleteAdminUser(userId)
      toast.success('Admin user deleted successfully')
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting admin user:', error)
      toast.error(error.message || 'Failed to delete admin user')
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      await api.updateAdminUser(user.id, { isActive: !user.isActive })
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`)
      fetchUsers()
    } catch (error: any) {
      console.error('Error updating user status:', error)
      toast.error(error.message || 'Failed to update user status')
    }
  }

  const isCurrentUser = (user: AdminUser) => {
    return currentUser?.email === user.email
  }

  const canEditUser = (user: AdminUser) => {
    // Only super admins can edit other super admins
    if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      return false
    }
    return true
  }

  const canDeleteUser = (user: AdminUser) => {
    // Cannot delete yourself
    if (isCurrentUser(user)) {
      return false
    }
    // Only super admins can delete users
    if (currentUser?.role !== 'super_admin') {
      return false
    }
    // Super admins can only be deleted by other super admins
    if (user.role === 'super_admin') {
      return currentUser?.role === 'super_admin'
    }
    return true
  }

  if (loading) {
    return (
      <Layout currentPage="Users" pageTitle="Admin User Management">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64"></div>
          <TableSkeleton rows={8} columns={5} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="Users" pageTitle="Admin User Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage admin users, roles, and permissions
            </p>
          </div>
          {currentUser?.role === 'super_admin' && (
            <button onClick={handleAdd} className="btn-primary flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Admin User
            </button>
          )}
        </div>


        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="manager">Manager</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Last Login</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <UserIcon className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : 'N/A'
                              }
                              {isCurrentUser(user) && (
                                <span className="ml-2 text-xs text-gray-500">(You)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{user.email}</td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={!canEditUser(user)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          } ${!canEditUser(user) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                          title={!canEditUser(user) ? 'You do not have permission to change this user\'s status' : ''}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="table-cell text-gray-500">
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          {canEditUser(user) && (
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {canDeleteUser(user) && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                          {!canEditUser(user) && !canDeleteUser(user) && (
                            <span className="text-xs text-gray-400">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="table-cell text-center text-gray-500 py-8">
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'No users found matching your criteria'
                        : 'No admin users found. Create your first admin user to get started.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Modal */}
        {showModal && (
          <AdminUserModal
            user={editingUser}
            onClose={() => {
              setShowModal(false)
              setEditingUser(null)
            }}
            onSave={() => {
              fetchUsers()
              setShowModal(false)
              setEditingUser(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}

// Admin User Modal
interface AdminUserModalProps {
  user: AdminUser | null
  onClose: () => void
  onSave: () => void
}

function AdminUserModal({ user, onClose, onSave }: AdminUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'support' as 'super_admin' | 'manager' | 'support',
    password: '',
    confirmPassword: '',
    isActive: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        password: '',
        confirmPassword: '',
        isActive: user.isActive
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (!user && !formData.password) {
      toast.error('Password is required for new users')
      return
    }

    setSaving(true)

    try {
      const payload: any = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        isActive: formData.isActive
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (user) {
        await api.updateAdminUser(user.id, payload)
        toast.success('Admin user updated successfully')
      } else {
        await api.createAdminUser(payload)
        toast.success('Admin user created successfully')
      }
      onSave()
    } catch (error: any) {
      console.error('Error saving admin user:', error)
      toast.error(error.message || 'Failed to save admin user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {user ? 'Edit Admin User' : 'Create Admin User'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="support">Support</option>
                    <option value="manager">Manager</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {!user && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required={!user}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required={!user}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </>
                )}

                {user && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter new password to change"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

