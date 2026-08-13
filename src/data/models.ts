export type Etat = 'rien' | 'en cours' | 'terminé'

export interface Branche {
    id?: number
    nom: string
    ordre: number
    creeLe: number
}

export interface Classe {
    id?: number
    nom: string
    ordre: number
    creeLe: number
}

export interface ClasseBranche {
    classeId: number
    brancheId: number
}

export interface Eleve {
    id?: number
    classeId: number
    nom: string
    ordre: number
    creeLe: number
}

export interface Theme {
    id?: number
    brancheId: number
    nom: string
    ordre: number
    creeLe: number
}

export interface Exercice {
    id?: number
    themeId: number
    nom: string
    ordre: number
    creeLe: number
}

export interface Progression {
    eleveId: number
    exerciceId: number
    etat: Etat
}

export interface Session {
    id?: number
    classeId: number
    brancheId: number
    nom: string
    exerciceIds: number[]
    creeLe: number
    modifieLe: number
}

export interface Configuration {
    cle: string
    valeur: unknown
}
