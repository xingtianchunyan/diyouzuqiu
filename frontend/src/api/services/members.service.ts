import { apiClient } from '../client'

export interface Member {
  id: string
  displayName: string
  team: 'RED' | 'BLUE' | null
  familyId: string | null
  avatarUrl?: string | null
  isCaptain?: boolean
}

export interface MemberDetail extends Member {
  mediaCount?: number
  worksCount?: number
  matchesCount?: number
}

export const membersService = {
  getMembers(params?: { team?: 'RED' | 'BLUE' }) {
    return apiClient.get<Member[]>('/members', { params })
  },
  
  createMember(data: { displayName: string; team?: 'RED' | 'BLUE' }) {
    return apiClient.post<Member>('/members', data)
  },
  
  updateMember(id: string, data: Partial<Member>) {
    return apiClient.put<Member>(`/members/${id}`, data)
  },

  uploadAvatar(id: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<Member>(`/members/${id}/avatar`, formData)
  },

  getMemberDetail(id: string) {
    return apiClient.get<MemberDetail>(`/members/${id}`)
  }
}
