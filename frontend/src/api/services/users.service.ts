import { apiClient } from '../client'
import type { Member } from './members.service'

export interface User {
  id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  memberId: string | null
  member?: Member | null
}

export const usersService = {
  getUsers() {
    return apiClient.get<User[]>('/admin/users')
  },
  createUser(data: any) {
    return apiClient.post<User>('/admin/users', data)
  },
  batchCreateUsers(data: { users: any[] }) {
    return apiClient.post<{ success: boolean; summary: {
      total: number
      created: number
      createdMembers: number
      createdFamilies: number
      failed: Array<{ row: number; email: string; reason: string }>
    } }>('/admin/users/batch', data)
  },
  updateUser(id: string, data: any) {
    return apiClient.put<User>(`/admin/users/${id}`, data)
  },
  deleteUser(id: string) {
    return apiClient.delete(`/admin/users/${id}`)
  }
}