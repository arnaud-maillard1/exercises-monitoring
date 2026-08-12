import ExcelJS from 'exceljs'
import {
    CLE_NOM_BRANCHE,
    lireNomBranche,
    nomPourFichier,
} from '../data/configuration'
import { db } from '../data/database'
import type { Etat, Exercice, Theme } from '../data/models'

interface GroupeTheme {
    theme: Theme
    exercices: Exercice[]
}

const presentationEtats: Record<Etat, {
    libelle: string
    fond: string
    texte: string
}> = {
    rien: {
        libelle: 'Rien',
        fond: 'FFF8FAFC',
        texte: 'FF64748B',
    },
    'en cours': {
        libelle: 'En cours',
        fond: 'FFFEF3C7',
        texte: 'FF92400E',
    },
    terminé: {
        libelle: 'Terminé',
        fond: 'FFDCFCE7',
        texte: 'FF166534',
    },
}

function telechargerFichier(contenu: BlobPart, nom: string): void {
    const url = URL.createObjectURL(new Blob([contenu], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }))
    const lien = document.createElement('a')

    lien.href = url
    lien.download = nom
    document.body.append(lien)
    lien.click()
    lien.remove()
    URL.revokeObjectURL(url)
}

function datePourNomFichier(date: Date): string {
    const annee = date.getFullYear()
    const mois = String(date.getMonth() + 1).padStart(2, '0')
    const jour = String(date.getDate()).padStart(2, '0')

    return `${annee}-${mois}-${jour}`
}

export async function exporterSuiviExcel(): Promise<void> {
    const donnees = await db.transaction(
        'r',
        db.eleves,
        db.themes,
        db.exercices,
        db.progressions,
        db.configuration,
        async () => {
            const [
                eleves,
                themes,
                exercices,
                progressions,
                configurationNom,
            ] =
                await Promise.all([
                    db.eleves.orderBy('ordre').toArray(),
                    db.themes.orderBy('ordre').toArray(),
                    db.exercices.toArray(),
                    db.progressions.toArray(),
                    db.configuration.get(CLE_NOM_BRANCHE),
                ])

            return {
                eleves,
                themes,
                exercices,
                progressions,
                nomBranche: lireNomBranche(configurationNom?.valeur),
            }
        },
    )

    if (donnees.eleves.length === 0) {
        throw new Error("Ajoute au moins un élève avant d'exporter")
    }

    if (donnees.exercices.length === 0) {
        throw new Error("Ajoute au moins un exercice avant d'exporter")
    }

    const groupes: GroupeTheme[] = donnees.themes
        .map((theme) => ({
            theme,
            exercices: donnees.exercices
                .filter((exercice) => exercice.themeId === theme.id)
                .sort((premier, second) => premier.ordre - second.ordre),
        }))
        .filter((groupe) => groupe.exercices.length > 0)

    const exercicesOrdonnes = groupes.flatMap(
        (groupe) => groupe.exercices,
    )
    const progressionParCellule = new Map<string, Etat>()

    for (const progression of donnees.progressions) {
        progressionParCellule.set(
            `${progression.eleveId}:${progression.exerciceId}`,
            progression.etat,
        )
    }

    const classeur = new ExcelJS.Workbook()
    const maintenant = new Date()
    const feuille = classeur.addWorksheet('Suivi', {
        views: [{
            state: 'frozen',
            xSplit: 1,
            ySplit: 5,
            topLeftCell: 'B6',
            activeCell: 'B6',
        }],
        pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
        },
    })

    classeur.creator = "Suivi d'exercices"
    classeur.created = maintenant
    classeur.modified = maintenant
    feuille.properties.defaultRowHeight = 21
    feuille.pageSetup.margins = {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
    }

    const derniereColonne = exercicesOrdonnes.length + 1
    feuille.mergeCells(1, 1, 1, derniereColonne)
    const titre = feuille.getCell(1, 1)
    titre.value = `Suivi d'exercices — ${donnees.nomBranche}`
    titre.font = {
        name: 'Arial',
        size: 18,
        bold: true,
        color: { argb: 'FFFFFFFF' },
    }
    titre.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1D4ED8' },
    }
    titre.alignment = { vertical: 'middle', horizontal: 'left' }
    feuille.getRow(1).height = 34

    feuille.mergeCells(2, 1, 2, derniereColonne)
    const dateExport = feuille.getCell(2, 1)
    dateExport.value = maintenant
    dateExport.numFmt = 'dd/mm/yyyy hh:mm'
    dateExport.font = {
        name: 'Arial',
        size: 10,
        italic: true,
        color: { argb: 'FF475569' },
    }
    dateExport.alignment = { horizontal: 'left' }
    feuille.getRow(3).height = 8

    feuille.mergeCells(4, 1, 5, 1)
    const enteteEleve = feuille.getCell(4, 1)
    enteteEleve.value = 'Élève'
    enteteEleve.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FF0F172A' },
    }
    enteteEleve.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
    }
    enteteEleve.alignment = {
        vertical: 'middle',
        horizontal: 'left',
    }

    let colonne = 2

    for (const groupe of groupes) {
        const premiereColonne = colonne
        const derniereColonneTheme = colonne + groupe.exercices.length - 1

        if (premiereColonne !== derniereColonneTheme) {
            feuille.mergeCells(
                4,
                premiereColonne,
                4,
                derniereColonneTheme,
            )
        }

        const celluleTheme = feuille.getCell(4, premiereColonne)
        celluleTheme.value = groupe.theme.nom
        celluleTheme.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF1E3A8A' },
        }
        celluleTheme.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDBEAFE' },
        }
        celluleTheme.alignment = {
            vertical: 'middle',
            horizontal: 'center',
        }

        for (const exercice of groupe.exercices) {
            const celluleExercice = feuille.getCell(5, colonne)
            celluleExercice.value = exercice.nom
            celluleExercice.font = {
                name: 'Arial',
                size: 10,
                bold: true,
                color: { argb: 'FF334155' },
            }
            celluleExercice.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' },
            }
            celluleExercice.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true,
            }
            colonne += 1
        }
    }

    feuille.getRow(4).height = 25
    feuille.getRow(5).height = 36
    feuille.getColumn(1).width = 24

    for (let index = 2; index <= derniereColonne; index += 1) {
        feuille.getColumn(index).width = 18
    }

    donnees.eleves.forEach((eleve, indexEleve) => {
        const ligne = indexEleve + 6
        const celluleEleve = feuille.getCell(ligne, 1)
        celluleEleve.value = eleve.nom
        celluleEleve.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: 'FF0F172A' },
        }
        celluleEleve.alignment = {
            vertical: 'middle',
            horizontal: 'left',
        }

        exercicesOrdonnes.forEach((exercice, indexExercice) => {
            const cellule = feuille.getCell(ligne, indexExercice + 2)
            const etat = eleve.id === undefined || exercice.id === undefined
                ? 'rien'
                : progressionParCellule.get(
                    `${eleve.id}:${exercice.id}`,
                ) ?? 'rien'
            const presentation = presentationEtats[etat]

            cellule.value = presentation.libelle
            cellule.font = {
                name: 'Arial',
                size: 10,
                bold: etat !== 'rien',
                color: { argb: presentation.texte },
            }
            cellule.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: presentation.fond },
            }
            cellule.alignment = {
                vertical: 'middle',
                horizontal: 'center',
            }
        })

        feuille.getRow(ligne).height = 24
    })

    const derniereLigne = donnees.eleves.length + 5

    for (let ligne = 4; ligne <= derniereLigne; ligne += 1) {
        for (
            let indexColonne = 1;
            indexColonne <= derniereColonne;
            indexColonne += 1
        ) {
            feuille.getCell(ligne, indexColonne).border = {
                bottom: {
                    style: 'thin',
                    color: { argb: 'FFE2E8F0' },
                },
                right: {
                    style: 'thin',
                    color: { argb: 'FFE2E8F0' },
                },
            }
        }
    }

    feuille.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5, column: derniereColonne },
    }

    const contenu = await classeur.xlsx.writeBuffer()
    const octets = new Uint8Array(contenu)

    telechargerFichier(
        octets,
        `suivi-${nomPourFichier(donnees.nomBranche)}-${datePourNomFichier(maintenant)}.xlsx`,
    )
}
