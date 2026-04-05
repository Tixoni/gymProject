import {
  computeSetRow,
  createComposedProgramWithSchedule,
  type WorkoutTemplateSetEntry,
} from '../trainingBuilder'
import { formatCommaNum, isValidCalendarDateKey } from '../utils/dateKeys'
import type { SetRow, Training } from './db'
import { SCHEDULED_PROGRAM_CYCLE_KIND, db } from './db'

export const workoutService = {
  
  // --- MUSCLE GROUPS ---
  async getAllMuscleGroups() {
    return await db.muscleGroupsTable.toArray();
  },

  async addMuscleGroup(title: string) {
    return await db.muscleGroupsTable.add({ title });
  },

  // --- EXERCISES ---
  async getExercisesByMuscleGroup(muscleGroupId: number) {
    return await db.exercisesTable
      .where('muscleGroupId')
      .equals(muscleGroupId)
      .toArray();
  },

  async addExercise(title: string, muscleGroupId: number, imgTitle?: string) {
    return await db.exercisesTable.add({
      title,
      muscleGroupId,
      ...(imgTitle != null && imgTitle !== '' ? { imgTitle } : {}),
    });
  },

  // --- PERSONAL MAXIMUMS (PM) ---
  async addPersonalMaximum(exerciseId: number, weight: number, reps: number, comment: string = '') {
    return await db.personalMaximumsTable.add({
      exerciseId,
      weight,
      reps,
      date: new Date().toISOString(),
      textComment: comment
    });
  },

  async getPMByExercise(exerciseId: number) {
    const rows = await db.personalMaximumsTable
      .where('exerciseId')
      .equals(exerciseId)
      .sortBy('date')
    return rows.reverse()
  },

  /** Максимальный вес среди записей ПМ по упражнению (для расчёта % от рекорда) */
  async getMaxPmWeightForExercise(exerciseId: number) {
    const rows = await db.personalMaximumsTable
      .where('exerciseId')
      .equals(exerciseId)
      .toArray()
    if (!rows.length) return 0
    return Math.max(...rows.map((r) => r.weight))
  },


  // --- BODY WEIGHT ---
  async addBodyWeight(weight: number) {
    const date = new Date().toISOString().split('T')[0]; 
    return await db.bodyWeightProviderTable.add({ date, weight });
  },
  
  async getWeightHistory() {
    return await db.bodyWeightProviderTable.orderBy('date').toArray();
  },

  // --- SETS ---
  async addSet(trainingId: number, exerciseId: number, data: {
    setNumber: number,
    weight: number,
    reps: number,
    percentageOfPM: number
  }) {
    return await db.setsTable.add({
      ...data,
      trainingId,
      exerciseId,
      status: 'not_completed' // значение по умолчанию
    });
  },

  async getSetsByTraining(trainingId: number) {
    return await db.setsTable
      .where('trainingId')
      .equals(trainingId)
      .toArray();
  },

  async updateSetById(setId: number, patch: Partial<SetRow>) {
    await db.setsTable.update(setId, patch)
  },

  /**
   * Тренировки с привязкой к циклу и их подходы — для вкладки «Сегодня».
   */
  async listTrainingsWithSetsForActiveCycles() {
    const trainings = await db.trainingsTable
      .filter((t) => t.cycleId != null && t.trainingId != null)
      .toArray()
    trainings.sort(
      (a, b) => (a.trainingId ?? 0) - (b.trainingId ?? 0),
    )
    return await Promise.all(
      trainings.map(async (t) => {
        const id = t.trainingId as number
        const sets = await db.setsTable.where('trainingId').equals(id).toArray()
        sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
        return { training: t, sets }
      }),
    )
  },

  /** Копия цикла (без дат); не для программ из «Составить программу». */
  async duplicateCycle(cycleId: number): Promise<{ newCycleId: number }> {
    const src = await db.trainingCyclesTable.get(cycleId)
    if (src?.cycleId == null) throw new Error('NOT_FOUND')
    if (src.cycleKind === SCHEDULED_PROGRAM_CYCLE_KIND) {
      throw new Error('NO_DUP_PROGRAM')
    }

    const baseTitle =
      src.cycleTitle?.trim() || `Цикл #${cycleId}`

    return await db.transaction(
      'rw',
      [
        db.setsTable,
        db.trainingsTable,
        db.workoutTemplatesTable,
        db.trainingCyclesTable,
      ],
      async () => {
        const newCycleId = await db.trainingCyclesTable.add({
          muscleGroupId: src.muscleGroupId,
          status: src.status ?? 'planned',
          cycleKind: src.cycleKind,
          cycleTitle: `${baseTitle} (копия)`,
        })

        const trainings = await db.trainingsTable
          .where('cycleId')
          .equals(cycleId)
          .toArray()
        trainings.sort(
          (a, b) =>
            (a.dayOfTheWeek ?? 0) - (b.dayOfTheWeek ?? 0) ||
            (a.trainingId ?? 0) - (b.trainingId ?? 0),
        )

        const tidMap = new Map<number, number>()

        for (const t of trainings) {
          const oldTid = t.trainingId
          if (oldTid == null) continue
          const newTid = await db.trainingsTable.add({
            status: t.status,
            cycleId: newCycleId,
            dayOfTheWeek: t.dayOfTheWeek,
            plannedDate: '',
            weekId: t.weekId,
            tonnage: t.tonnage,
            IntensityInKG: t.IntensityInKG,
            IntensityInPercentage: t.IntensityInPercentage,
            totalReps: t.totalReps,
          })
          tidMap.set(oldTid, newTid)

          const sets = await db.setsTable
            .where('trainingId')
            .equals(oldTid)
            .toArray()
          sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
          for (const s of sets) {
            await db.setsTable.add({
              trainingId: newTid,
              exerciseId: s.exerciseId,
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              percentageOfPM: s.percentageOfPM,
              status: s.status,
              actualReps: s.actualReps,
            })
          }
        }

        const templates = await db.workoutTemplatesTable
          .where('cycleId')
          .equals(cycleId)
          .toArray()
        const createdAt = new Date().toISOString()
        for (const tm of templates) {
          const oldTid = tm.trainingId
          if (oldTid == null) continue
          const newTid = tidMap.get(oldTid)
          if (newTid == null) continue
          await db.workoutTemplatesTable.add({
            title: tm.title,
            muscleGroupId: tm.muscleGroupId,
            exerciseId: tm.exerciseId,
            setsJson: tm.setsJson,
            createdAt,
            cycleId: newCycleId,
            trainingId: newTid,
          })
        }

        return { newCycleId }
      },
    )
  },

  /**
   * Один цикл = одно упражнение во всех тренировках: смена группы/упражнения и
   * пересчёт подходов по шаблону setsJson (не для scheduled_program).
   */
  async applyUniformExerciseToCycle(
    cycleId: number,
    muscleGroupId: number,
    exerciseId: number,
  ) {
    const c = await db.trainingCyclesTable.get(cycleId)
    if (!c) throw new Error('NOT_FOUND')
    if (c.cycleKind === SCHEDULED_PROGRAM_CYCLE_KIND) {
      throw new Error('PROGRAM_CYCLE')
    }
    const pmMax = await this.getMaxPmWeightForExercise(exerciseId)

    await db.transaction(
      'rw',
      [
        db.trainingCyclesTable,
        db.trainingsTable,
        db.setsTable,
        db.workoutTemplatesTable,
      ],
      async () => {
        await db.trainingCyclesTable.update(cycleId, { muscleGroupId })

        const trainings = await db.trainingsTable
          .where('cycleId')
          .equals(cycleId)
          .toArray()
        trainings.sort(
          (a, b) =>
            (a.dayOfTheWeek ?? 0) - (b.dayOfTheWeek ?? 0) ||
            (a.trainingId ?? 0) - (b.trainingId ?? 0),
        )

        for (const t of trainings) {
          const tid = t.trainingId
          if (tid == null) continue

          const templates = await db.workoutTemplatesTable
            .where('trainingId')
            .equals(tid)
            .toArray()
          if (templates.length !== 1) continue

          const tmpl = templates[0]
          const templateId = tmpl.templateId
          if (templateId == null) continue

          let plan: WorkoutTemplateSetEntry[] = []
          try {
            const parsed = JSON.parse(tmpl.setsJson) as unknown
            if (Array.isArray(parsed)) {
              for (const row of parsed) {
                const r = row as Record<string, unknown>
                const wm =
                  r.weightMode === 'percent' ? 'percent' : ('kg' as const)
                plan.push({
                  weightMode: wm,
                  weightKg: Number(r.weightKg ?? r.displayWeightKg) || 0,
                  percentOfPm:
                    Number(r.percentOfPm ?? r.displayPercentOfPm) || 0,
                  reps: Math.max(1, Math.floor(Number(r.reps)) || 1),
                })
              }
            }
          } catch {
            plan = []
          }

          const existingSets = await db.setsTable
            .where('trainingId')
            .equals(tid)
            .toArray()
          existingSets.sort(
            (a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0),
          )

          if (!plan.length && existingSets.length) {
            plan = existingSets.map((s) => ({
              weightMode:
                (s.percentageOfPM ?? 0) > 0
                  ? ('percent' as const)
                  : ('kg' as const),
              weightKg: s.weight,
              percentOfPm: s.percentageOfPM,
              reps: s.reps,
            }))
          }
          if (!plan.length) continue

          for (const s of existingSets) {
            if (s.setId != null) await db.setsTable.delete(s.setId)
          }

          const enriched: Record<string, unknown>[] = []
          let setNumber = 1
          for (const entry of plan) {
            const { weight, percentageOfPM, reps } = computeSetRow(
              entry,
              pmMax,
            )
            const dispKg = Math.round(weight * 1000) / 1000
            const dispPct = Math.round(percentageOfPM * 100) / 100
            enriched.push({
              weightMode: entry.weightMode,
              weightKg: entry.weightKg,
              percentOfPm: entry.percentOfPm,
              reps: entry.reps,
              displayWeightKg: dispKg,
              displayPercentOfPm: dispPct,
            })
            await db.setsTable.add({
              trainingId: tid,
              exerciseId,
              setNumber: setNumber++,
              weight: dispKg,
              reps,
              percentageOfPM: dispPct,
              status: 'not_completed',
            })
          }

          await db.workoutTemplatesTable.update(templateId, {
            muscleGroupId,
            exerciseId,
            setsJson: JSON.stringify(enriched),
          })
        }
      },
    )
  },

  /** Название цикла (`cycleTitle`) или составной программы (`programTitle`). */
  async updateCycleTitle(cycleId: number, title: string) {
    const c = await db.trainingCyclesTable.get(cycleId)
    if (!c) throw new Error('NOT_FOUND')
    const t = title.trim()
    if (!t) throw new Error('EMPTY_TITLE')
    if (c.cycleKind === SCHEDULED_PROGRAM_CYCLE_KIND) {
      await db.trainingCyclesTable.update(cycleId, { programTitle: t })
    } else {
      await db.trainingCyclesTable.update(cycleId, { cycleTitle: t })
    }
  },

  /** Удалить цикл, все его тренировки, сеты и шаблоны с этим cycleId */
  async deleteCycleCascade(cycleId: number) {
    await db.transaction(
      'rw',
      [
        db.setsTable,
        db.trainingsTable,
        db.workoutTemplatesTable,
        db.trainingCyclesTable,
      ],
      async () => {
        const trainings = await db.trainingsTable
          .where('cycleId')
          .equals(cycleId)
          .toArray()
        const tids = trainings
          .map((t) => t.trainingId)
          .filter((id): id is number => id != null)
        for (const tid of tids) {
          await db.setsTable.where('trainingId').equals(tid).delete()
        }
        for (const tid of tids) {
          await db.trainingsTable.delete(tid)
        }
        await db.workoutTemplatesTable.where('cycleId').equals(cycleId).delete()
        await db.trainingCyclesTable.delete(cycleId)
      },
    )
  },

  /** Старые шаблоны без cycleId: удалить тренировку, сеты и шаблон */
  async deleteOrphanProgram(templateId: number, trainingId: number | undefined) {
    await db.transaction(
      'rw',
      [db.setsTable, db.trainingsTable, db.workoutTemplatesTable],
      async () => {
        if (trainingId != null) {
          await db.setsTable.where('trainingId').equals(trainingId).delete()
          await db.trainingsTable.delete(trainingId)
        }
        await db.workoutTemplatesTable.delete(templateId)
      },
    )
  },

  /** Даты, на которые запланирована хотя бы одна тренировка (только реальные YYYY-MM-DD). */
  async listDateKeysWithPlannedTrainings(): Promise<string[]> {
    const trainings = await db.trainingsTable.toArray()
    const keys = trainings
      .map((t) => t.plannedDate)
      .filter((d): d is string => isValidCalendarDateKey(d))
    return [...new Set(keys)].sort()
  },

  /** Тренировки на конкретный день (plannedDate = YYYY-MM-DD) */
  async getTrainingsOnDateKey(dateKey: string) {
    if (!isValidCalendarDateKey(dateKey)) return []
    const trainings = await db.trainingsTable
      .filter(
        (t) => t.plannedDate === dateKey && t.trainingId != null,
      )
      .toArray()
    trainings.sort((a, b) => (a.trainingId ?? 0) - (b.trainingId ?? 0))
    return await Promise.all(
      trainings.map(async (t) => {
        const id = t.trainingId as number
        const sets = await db.setsTable.where('trainingId').equals(id).toArray()
        sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
        return { training: t, sets }
      }),
    )
  },

  /**
   * Циклы из IndexedDB в форме, совместимой с `CycleTemplate` (вкладка «Программы»).
   */
  async listSavedCyclesAsTemplateCycles() {
    try {
    const rows = await this.listSavedWorkoutPrograms()
    const cycleRows = await db.trainingCyclesTable.toArray()
    const cycleById = new Map(
      cycleRows
        .filter((c) => c.cycleId != null)
        .map((c) => [c.cycleId as number, c] as const),
    )
    const map = new Map<
      string,
      {
        key: string
        cycleId: number | undefined
        programs: (typeof rows)[number][]
      }
    >()
    for (const p of rows) {
      const key = p.cycleId != null ? `c-${p.cycleId}` : `t-${p.templateId}`
      if (!map.has(key)) {
        map.set(key, { key, cycleId: p.cycleId, programs: [] })
      }
      map.get(key)!.programs.push(p)
    }

    const cycleIdsForSort = [
      ...new Set(
        Array.from(map.values())
          .map((g) => g.cycleId)
          .filter((id): id is number => id != null),
      ),
    ]
    const trainingsByCycleForSort = new Map<number, Training[]>()
    for (const cid of cycleIdsForSort) {
      trainingsByCycleForSort.set(
        cid,
        await db.trainingsTable.where('cycleId').equals(cid).toArray(),
      )
    }

    const rankTraining = (
      cycleId: number | undefined,
      trainingId: number | undefined,
    ) => {
      if (trainingId == null) return 0
      if (cycleId == null) return trainingId
      const trs = trainingsByCycleForSort.get(cycleId)
      if (!trs) return trainingId
      const t = trs.find((x) => x.trainingId === trainingId)
      return (t?.dayOfTheWeek ?? 999) * 1_000_000 + trainingId
    }

    for (const g of map.values()) {
      if (g.cycleId != null) {
        g.programs.sort(
          (a, b) =>
            rankTraining(g.cycleId, a.trainingId) -
            rankTraining(g.cycleId, b.trainingId),
        )
      } else {
        g.programs.sort(
          (a, b) => (a.trainingId ?? 0) - (b.trainingId ?? 0),
        )
      }
    }

    const groups = Array.from(map.values()).sort((a, b) => {
      const da = a.programs[0]?.createdAt ?? ''
      const db_ = b.programs[0]?.createdAt ?? ''
      return db_.localeCompare(da)
    })

    return groups.flatMap((group) => {
      if (!group.programs.length) return []
      const cycleId = group.cycleId
      const cycMeta = cycleId != null ? cycleById.get(cycleId) : undefined
      const isProgram =
        cycMeta?.cycleKind === SCHEDULED_PROGRAM_CYCLE_KIND
      const cycleTitleTrim = cycMeta?.cycleTitle?.trim()
      const programTitleTrim = cycMeta?.programTitle?.trim()
      const cycleNamePlain =
        isProgram && programTitleTrim
          ? programTitleTrim
          : cycleTitleTrim
            ? cycleTitleTrim
            : group.programs.length > 1
              ? `Цикл #${cycleId ?? '—'}`
              : group.programs[0]?.title ?? 'Цикл'

      const title =
        isProgram && programTitleTrim
          ? `${programTitleTrim} · ${group.programs.length} трен.`
          : cycleTitleTrim
            ? `${cycleTitleTrim} · ${group.programs.length} трен.`
            : group.programs.length > 1
              ? `Цикл #${cycleId ?? '—'} · ${group.programs.length} трен.`
              : group.programs[0]?.title ?? 'Цикл'

      const weekRows = group.programs.map((p) => {
        const planSets = (p.planSets ?? []) as Array<Record<string, unknown>>
        const n = planSets.length
        const first = planSets[0]
        let weightLabel = '—'
        let repsLabel: string | number = '—'
        if (first) {
          const kgRaw = first.displayWeightKg ?? first.weightKg
          const pctRaw = first.displayPercentOfPm ?? first.percentOfPm
          const kg = kgRaw != null ? Number(kgRaw) : NaN
          const pct = pctRaw != null ? Number(pctRaw) : NaN
          repsLabel =
            first.reps != null && first.reps !== ''
              ? String(first.reps)
              : '—'
          if (Number.isFinite(kg) && kg > 0) {
            weightLabel = `${formatCommaNum(kg)} кг`
            if (Number.isFinite(pct) && pct > 0) {
              weightLabel += ` (${formatCommaNum(pct)}% ПМ)`
            }
          } else if (first.weightMode === 'percent' && first.percentOfPm) {
            weightLabel = `${String(first.percentOfPm)}% ПМ`
          }
        }
        const trainingTitle =
          typeof p.title === 'string' && p.title.trim()
            ? p.title.trim()
            : String(p.exerciseTitle ?? 'Тренировка')
        return {
          exerciseId: p.exerciseTitle,
          trainingTitle,
          sets: n,
          reps: repsLabel,
          weight: weightLabel,
          trainingId: p.trainingId,
          templateId: p.templateId,
          cycleId: group.cycleId,
        }
      })

      const first = group.programs[0]
      const deleteSpec =
        cycleId != null
          ? ({ kind: 'cycle' as const, cycleId })
          : ({
              kind: 'orphan' as const,
              templateId: first!.templateId,
              trainingId: first!.trainingId,
            })

      return [
        {
          id: cycleId != null ? `db-${cycleId}` : `db-${group.key}`,
          cycleId,
          cycleName: cycleNamePlain,
          muscleGroup: title,
          currentWeek: 1,
          weeks: { '1': weekRows },
          planText: group.programs.map((x) => x.title).join('\n'),
          deleteSpec,
          cycleKind: cycMeta?.cycleKind,
          isScheduledProgram: isProgram,
        },
      ]
    })
    } catch (e) {
      console.error('listSavedCyclesAsTemplateCycles', e)
      return []
    }
  },

  /**
   * Раньше подставляли даты автоматически; теперь даты задаются через «Составить программу»
   * или вручную. Оставлено для совместимости вызова из main.
   */
  async backfillMissingPlannedDates() {},

  async createComposedProgram(
    input: Parameters<typeof createComposedProgramWithSchedule>[0],
  ) {
    return createComposedProgramWithSchedule(input)
  },

  /** Циклы и тренировки для конструктора «Составить программу». */
  async listCyclesForComposer(): Promise<
    {
      cycleId: number
      title: string
      trainings: { trainingId: number; label: string }[]
    }[]
  > {
    const [cycles, trainings, templates] = await Promise.all([
      db.trainingCyclesTable.toArray(),
      db.trainingsTable.toArray(),
      db.workoutTemplatesTable.toArray(),
    ])
    const trainingsByCycle = new Map<number, typeof trainings>()
    for (const t of trainings) {
      if (t.cycleId == null || t.trainingId == null) continue
      const c = t.cycleId
      if (!trainingsByCycle.has(c)) trainingsByCycle.set(c, [])
      trainingsByCycle.get(c)!.push(t)
    }
    const tmplKey = (cycleId: number, trainingId: number) =>
      `${cycleId}:${trainingId}`
    const tmplByPair = new Map<string, (typeof templates)[number]>()
    for (const tm of templates) {
      if (tm.cycleId == null || tm.trainingId == null) continue
      const key = tmplKey(tm.cycleId, tm.trainingId)
      if (!tmplByPair.has(key)) tmplByPair.set(key, tm)
    }

    const out: {
      cycleId: number
      title: string
      trainings: { trainingId: number; label: string }[]
    }[] = []

    for (const c of cycles) {
      const cid = c.cycleId
      if (cid == null) continue
      if (c.cycleKind === SCHEDULED_PROGRAM_CYCLE_KIND) continue
      const list = [...(trainingsByCycle.get(cid) ?? [])]
      if (!list.length) continue
      list.sort(
        (a, b) =>
          (a.dayOfTheWeek ?? 0) - (b.dayOfTheWeek ?? 0) ||
          (a.trainingId ?? 0) - (b.trainingId ?? 0),
      )
      const trainingsOut: { trainingId: number; label: string }[] = []
      for (const t of list) {
        const tid = t.trainingId as number
        const tm = tmplByPair.get(tmplKey(cid, tid))
        trainingsOut.push({
          trainingId: tid,
          label: tm?.title ?? `Тренировка #${tid}`,
        })
      }
      out.push({
        cycleId: cid,
        title:
          c.cycleTitle?.trim() ||
          `Цикл #${cid} · ${trainingsOut.length} тр.`,
        trainings: trainingsOut,
      })
    }
    out.sort((a, b) => b.cycleId - a.cycleId)
    return out
  },

  /** Снимок одного блока (шаблон + подходы этого упражнения в тренировке). */
  async getTrainingEditSnapshot(templateId: number) {
    const template = await db.workoutTemplatesTable.get(templateId)
    if (template?.trainingId == null) return null
    const trainingId = template.trainingId
    const exId = template.exerciseId
    const allSets = await db.setsTable.where('trainingId').equals(trainingId).toArray()
    const sets = allSets
      .filter((s) => s.exerciseId === exId)
      .sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
    return { template, sets, trainingId }
  },

  async updateTrainingFromTemplateForm(
    templateId: number,
    input: {
      title: string
      muscleGroupId: number
      exerciseId: number
      sets: WorkoutTemplateSetEntry[]
      pmMaxWeightKg: number
    },
  ) {
    const tmpl = await db.workoutTemplatesTable.get(templateId)
    if (tmpl?.trainingId == null) throw new Error('NOT_FOUND')
    const trainingId = tmpl.trainingId
    const oldEx = tmpl.exerciseId

    const enrichedSets = input.sets.map((s) => {
      const { weight, percentageOfPM } = computeSetRow(s, input.pmMaxWeightKg)
      return {
        ...s,
        displayWeightKg: Math.round(weight * 1000) / 1000,
        displayPercentOfPm: Math.round(percentageOfPM * 100) / 100,
      }
    })

    await db.transaction(
      'rw',
      [db.setsTable, db.workoutTemplatesTable],
      async () => {
        const existing = await db.setsTable
          .where('trainingId')
          .equals(trainingId)
          .toArray()
        for (const s of existing) {
          if (s.exerciseId === oldEx && s.setId != null) {
            await db.setsTable.delete(s.setId)
          }
        }
        const after = await db.setsTable
          .where('trainingId')
          .equals(trainingId)
          .toArray()
        let sn = after.reduce((m, s) => Math.max(m, s.setNumber ?? 0), 0)
        for (const s of input.sets) {
          const { weight, percentageOfPM, reps } = computeSetRow(
            s,
            input.pmMaxWeightKg,
          )
          sn += 1
          await db.setsTable.add({
            trainingId,
            exerciseId: input.exerciseId,
            setNumber: sn,
            weight: Math.round(weight * 1000) / 1000,
            reps,
            percentageOfPM: Math.round(percentageOfPM * 100) / 100,
            status: 'not_completed',
          })
        }
        await db.workoutTemplatesTable.update(templateId, {
          title: input.title.trim(),
          muscleGroupId: input.muscleGroupId,
          exerciseId: input.exerciseId,
          setsJson: JSON.stringify(enrichedSets),
        })
      },
    )
  },

  /** Шаблоны из IndexedDB с названиями группы и упражнения (для UI «Программы») */
  async listSavedWorkoutPrograms() {
    const [templates, muscleGroups, exercises] = await Promise.all([
      db.workoutTemplatesTable.orderBy('templateId').toArray(),
      db.muscleGroupsTable.toArray(),
      db.exercisesTable.toArray(),
    ])
    const mgTitle = new Map(
      muscleGroups.map((g) => [g.muscleGroupId, g.title] as const),
    )
    const exTitle = new Map(
      exercises.map((e) => [e.exerciseId, e.title] as const),
    )
    return templates
      .filter((t) => t.templateId != null)
      .map((t) => {
        let planSets: unknown[] = []
        try {
          const parsed = JSON.parse(t.setsJson) as unknown
          planSets = Array.isArray(parsed) ? parsed : []
        } catch {
          planSets = []
        }
        return {
          templateId: t.templateId as number,
          cycleId: t.cycleId,
          trainingId: t.trainingId,
          title: t.title,
          muscleGroupTitle: mgTitle.get(t.muscleGroupId) ?? '—',
          exerciseTitle: exTitle.get(t.exerciseId) ?? '—',
          createdAt: t.createdAt,
          planSets,
        }
      })
  },
};