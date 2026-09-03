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
  // Baseline ability ratings (0-99, default 60), admin-managed
  pace?: number
  shooting?: number
  passing?: number
  dribbling?: number
  defending?: number
  stamina?: number
}

export interface MemberStats {
  memberId: string
  appearances: number
  wins: number
  /** 0-1 ratio; a draw is not a win */
  winRate: number
  mvpCount: number
}

export const membersService = {
  getMembers(params?: { team?: 'RED' | 'BLUE' }) {
    return apiClient.get<Member[]>('/members', { params })
  },
  
  createMember(data: { displayName: string; team?: 'RED' | 'BLUE'; familyId?: string }) {
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
  },

  getMemberStats(id: string) {
    return apiClient.get<MemberStats>(`/members/${id}/stats`)
  }
}
