import { apiClient } from '../client'
import type { Media } from './media.service'
import type { Work } from './works.service'
import type { Match } from './matches.service'

export interface YearAggregation {
  year: number
  media: Media[]
  works: Work[]
  matches: Match[]
  events: any[]
}

export const yearsService = {
  getYearAggregation(year: number) {
    return apiClient.get<YearAggregation>(`/years/${year}`)
  }
}
