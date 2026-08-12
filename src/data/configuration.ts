export const CLE_NOM_BRANCHE = 'nomBranche'
export const NOM_BRANCHE_PAR_DEFAUT = 'Ma branche'

export function lireNomBranche(valeur: unknown): string {
    return typeof valeur === 'string' && valeur.trim().length > 0
        ? valeur.trim()
        : NOM_BRANCHE_PAR_DEFAUT
}

export function nomPourFichier(nom: string): string {
    const nomNettoye = nom
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return nomNettoye || 'ma-branche'
}
