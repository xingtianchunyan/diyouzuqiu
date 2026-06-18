import { apiClient } from '../client'

export interface MatchParticipant {
  memberId: string
  side: 'RED' | 'BLUE'
}

export interface Match {
  id: string
  playedAt: string
  redScore: number
  blueScore: number
  mvpMemberId: string | null
  mvpMember?: {
    id: string
    displayName: string
  }
  createdByUserId?: string
}

export interface MatchDetail extends Match {
  participants: MatchParticipant[]
  notes?: string
}

export const matchesService = {
  getMatches(params?: { year?: number; memberId?: string }) {
    return apiClient.get<Match[]>('/matches', { params })
  },
  
  createMatch(data: {
    playedAt: string
    redScore: number
    blueScore: number
    mvpMemberId?: string
    participantIds: MatchParticipant[]
  }) {
    return apiClient.post<{ id: string }>('/matches', data)
  },
  
  getMatchDetail(id: string) {
    return apiClient.get<MatchDetail>(`/matches/${id}`)
  },
  
  updateMatch(id: string, data: {
    playedAt?: string
    redScore?: number
    blueScore?: number
    mvpMemberId?: string
    notes?: string
    participantIds?: MatchParticipant[]
  }) {
    return apiClient.put<MatchDetail>(`/matches/${id}`, data)
  },

  deleteMatch(id: string) {
    return apiClient.delete(`/matches/${id}`)
  }
}
