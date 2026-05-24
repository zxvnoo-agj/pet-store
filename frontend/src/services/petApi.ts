import { apiClient } from './api'
import type { Pet, PetBreed } from '../types'

export async function createPet(data: {
  species: string
  breed_id?: number | null
  nickname?: string | null
  age_months?: number | null
  weight_kg?: number | null
  notes?: string | null
}): Promise<Pet> {
  return apiClient.post<Pet>('/pets', data)
}

export async function getMyPets(): Promise<{ pets: Pet[]; total: number }> {
  return apiClient.get<{ pets: Pet[]; total: number }>('/pets')
}

export async function getBreeds(species: string): Promise<{ breeds: PetBreed[] }> {
  return apiClient.get<{ breeds: PetBreed[] }>('/pet-breeds', { species })
}

export async function updatePet(
  petId: number,
  data: {
    species?: string
    breed_id?: number | null
    nickname?: string | null
    age_months?: number | null
    weight_kg?: number | null
    notes?: string | null
  }
): Promise<Pet> {
  return apiClient.put<Pet>(`/pets/${petId}`, data)
}

export async function deletePet(petId: number): Promise<void> {
  return apiClient.delete<void>(`/pets/${petId}`)
}

export async function getLastSelectedPet(): Promise<{ pet_id: number | null }> {
  return apiClient.get<{ pet_id: number | null }>('/pets/last-selected')
}

export async function setLastSelectedPet(petId: number): Promise<{ pet_id: number }> {
  return apiClient.put<{ pet_id: number }>('/pets/last-selected', { pet_id: petId })
}

export async function getSuggestedQuestions(): Promise<{
  questions: string[]
  source: 'ai' | 'cache' | 'default'
}> {
  return apiClient.get<{
    questions: string[]
    source: 'ai' | 'cache' | 'default'
  }>('/chat/suggested-questions')
}
