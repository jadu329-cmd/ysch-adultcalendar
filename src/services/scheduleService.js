import { db } from '../firebase/config'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { format, getDay, startOfMonth, addDays, addWeeks, parseISO } from 'date-fns'
import { initialSchedules } from '../data/initialSchedules'
import { isHoliday } from '../data/holidays'

const SCHEDULES_COLLECTION = 'schedules'

// 일정 데이터 저장
export const saveSchedule = async (schedule) => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return null
    }

    const scheduleData = {
      ...schedule,
      date: typeof schedule.date === 'string' ? schedule.date : format(schedule.date, 'yyyy-MM-dd'),
      startDate: schedule.startDate ? (typeof schedule.startDate === 'string' ? schedule.startDate : format(schedule.startDate, 'yyyy-MM-dd')) : null,
      endDate: schedule.endDate ? (typeof schedule.endDate === 'string' ? schedule.endDate : format(schedule.endDate, 'yyyy-MM-dd')) : null,
      createdAt: schedule.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const scheduleRef = doc(db, SCHEDULES_COLLECTION, schedule.id)
    await setDoc(scheduleRef, scheduleData)
    return scheduleData
  } catch (error) {
    console.error('일정 저장 오류:', error)
    throw error
  }
}

// 일정 삭제
export const deleteSchedule = async (scheduleId) => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return
    }

    const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId)
    await deleteDoc(scheduleRef)
  } catch (error) {
    console.error('일정 삭제 오류:', error)
    throw error
  }
}

// 특정 날짜의 일정 가져오기
export const getSchedulesByDate = async (date) => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return []
    }

    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd')
    const schedulesRef = collection(db, SCHEDULES_COLLECTION)
    const q = query(schedulesRef, where('date', '==', dateStr))
    const querySnapshot = await getDocs(q)
    
    const schedules = []
    querySnapshot.forEach((doc) => {
      schedules.push({ id: doc.id, ...doc.data() })
    })
    
    return schedules
  } catch (error) {
    console.error('일정 조회 오류:', error)
    return []
  }
}

// 월별 일정 가져오기
export const getSchedulesByMonth = async (year, month) => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return {}
    }

    const schedulesRef = collection(db, SCHEDULES_COLLECTION)
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`
    
    const q = query(
      schedulesRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    const schedulesByDate = {}
    
    // 일반 일정만 먼저 추가 (기간 일정 제외)
    querySnapshot.forEach((doc) => {
      const schedule = { id: doc.id, ...doc.data() }
      // 기간 일정이 아닌 경우만 추가
      if (!schedule.startDate || !schedule.endDate || schedule.startDate === schedule.endDate) {
        const date = schedule.date
        if (!schedulesByDate[date]) {
          schedulesByDate[date] = []
        }
        schedulesByDate[date].push(schedule)
      }
    })

    // 기간 일정 처리 (해당 월과 겹치는 모든 날짜에 추가)
    // 모든 일정을 가져와서 기간 일정을 찾아 처리
    const allSchedulesQ = query(schedulesRef, orderBy('startDate', 'asc'))
    const allSnapshot = await getDocs(allSchedulesQ)
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    const processedPeriodSchedules = new Set()
    
    allSnapshot.forEach((doc) => {
      const schedule = { id: doc.id, ...doc.data() }
      // 기간 일정만 처리
      if (schedule.startDate && schedule.endDate && schedule.startDate !== schedule.endDate) {
        const periodKey = `${schedule.startDate}_${schedule.endDate}_${schedule.title}`
        
        // 이미 처리된 기간 일정은 스킵
        if (processedPeriodSchedules.has(periodKey)) {
          return
        }
        
        const start = parseISO(schedule.startDate)
        const end = parseISO(schedule.endDate)
        
        // 기간 일정이 해당 월과 겹치는 경우
        if (start <= monthEnd && end >= monthStart) {
          processedPeriodSchedules.add(periodKey)
          
          // 기간 내의 각 날짜에 한 번만 추가 (해당 월 범위 내에서)
          let current = new Date(Math.max(start.getTime(), monthStart.getTime()))
          const last = new Date(Math.min(end.getTime(), monthEnd.getTime()))
          
          // 시간을 00:00:00으로 설정하여 날짜 비교 정확도 향상
          current.setHours(0, 0, 0, 0)
          const lastDate = new Date(last)
          lastDate.setHours(23, 59, 59, 999)
          
          while (current <= lastDate) {
            const dateStr = format(current, 'yyyy-MM-dd')
            if (!schedulesByDate[dateStr]) {
              schedulesByDate[dateStr] = []
            }
            // 이미 같은 기간 일정이 추가되지 않은 경우만 추가
            const periodExists = schedulesByDate[dateStr].some(s => 
              s.startDate === schedule.startDate && 
              s.endDate === schedule.endDate &&
              s.title === schedule.title
            )
            if (!periodExists) {
              schedulesByDate[dateStr].push(schedule)
            }
            current = addDays(current, 1)
          }
        }
      }
    })
    
    return schedulesByDate
  } catch (error) {
    console.error('월별 일정 조회 오류:', error)
    return {}
  }
}

// 모든 일정 가져오기
export const getAllSchedules = async () => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return []
    }

    const schedulesRef = collection(db, SCHEDULES_COLLECTION)
    const querySnapshot = await getDocs(query(schedulesRef, orderBy('date', 'asc')))
    
    const schedules = []
    querySnapshot.forEach((doc) => {
      schedules.push({ id: doc.id, ...doc.data() })
    })
    
    return schedules
  } catch (error) {
    console.error('일정 조회 오류:', error)
    return []
  }
}

// 일괄 일정 저장 (Excel 업로드용)
export const saveMultipleSchedules = async (schedules, replaceAll = false) => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return
    }

    if (replaceAll) {
      // 전체 삭제 후 저장
      const allSchedules = await getAllSchedules()
      for (const schedule of allSchedules) {
        await deleteSchedule(schedule.id)
      }
    }

    // 새 일정들 저장
    for (const schedule of schedules) {
      await saveSchedule(schedule)
    }
  } catch (error) {
    console.error('일괄 일정 저장 오류:', error)
    throw error
  }
}

// 초기 데이터 초기화 (데이터가 없을 때만)
export const initializeInitialSchedules = async () => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return
    }

    // 기존 데이터가 있는지 확인
    const existingSchedules = await getAllSchedules()
    if (existingSchedules.length > 0) {
      console.log('기존 데이터가 있어 초기 데이터를 로드하지 않습니다.')
      return
    }

    // 초기 데이터 저장
    console.log('초기 데이터를 로드합니다...')
    for (const schedule of initialSchedules) {
      await saveSchedule(schedule)
    }
    console.log('초기 데이터 로드 완료')
  } catch (error) {
    console.error('초기 데이터 초기화 오류:', error)
  }
}

// 전월 일정 복사
export const copyPreviousMonthSchedules = async (fromYear, fromMonth, toYear, toMonth) => {
  try {
    if (!db) {
      console.warn('Firebase가 초기화되지 않았습니다.')
      return
    }

    const fromSchedules = await getSchedulesByMonth(fromYear, fromMonth)
    const schedulesToCopy = []
    
    // 모든 일정을 평면 배열로 변환 (공휴일 제외)
    Object.values(fromSchedules).forEach(dateSchedules => {
      dateSchedules.forEach(schedule => {
        // 공휴일인 경우 복사하지 않음
        const scheduleDate = typeof schedule.date === 'string' ? parseISO(schedule.date) : new Date(schedule.date)
        if (isHoliday(scheduleDate)) {
          return
        }
        
        // 이미 추가되지 않은 경우만 추가 (중복 방지)
        if (!schedulesToCopy.find(s => s.id === schedule.id)) {
          schedulesToCopy.push(schedule)
        }
      })
    })

    // 같은 요일 기준으로 날짜를 새 월로 변경하는 헬퍼 함수
    const getSameWeekdayInMonth = (oldDate, targetYear, targetMonth) => {
      const oldDateObj = typeof oldDate === 'string' ? parseISO(oldDate) : new Date(oldDate)
      const oldDayOfWeek = getDay(oldDateObj) // 0=일요일, 1=월요일, ..., 6=토요일
      
      // 원래 달의 시작일
      const oldMonthStart = startOfMonth(oldDateObj)
      
      // 원래 날짜가 그 달의 몇 번째 해당 요일인지 계산
      const daysFromMonthStart = Math.floor((oldDateObj - oldMonthStart) / (1000 * 60 * 60 * 24))
      const oldMonthStartDayOfWeek = getDay(oldMonthStart)
      
      // 첫 번째 해당 요일까지의 일수 계산
      let firstOccurrenceDay = 0
      if (oldMonthStartDayOfWeek <= oldDayOfWeek) {
        firstOccurrenceDay = oldDayOfWeek - oldMonthStartDayOfWeek
      } else {
        firstOccurrenceDay = 7 - oldMonthStartDayOfWeek + oldDayOfWeek
      }
      
      // 몇 번째 해당 요일인지 계산 (0-based)
      const occurrenceIndex = Math.floor((daysFromMonthStart - firstOccurrenceDay) / 7)
      
      // 새 달의 시작일과 요일
      const newMonthStart = new Date(targetYear, targetMonth, 1)
      const newMonthStartDayOfWeek = getDay(newMonthStart)
      
      // 새 달에서 첫 번째 해당 요일 찾기
      let firstNewOccurrenceDay = 0
      if (newMonthStartDayOfWeek <= oldDayOfWeek) {
        firstNewOccurrenceDay = oldDayOfWeek - newMonthStartDayOfWeek
      } else {
        firstNewOccurrenceDay = 7 - newMonthStartDayOfWeek + oldDayOfWeek
      }
      
      // 같은 순서의 해당 요일 계산
      const newDate = addDays(newMonthStart, firstNewOccurrenceDay + (occurrenceIndex * 7))
      
      // 새 달 범위를 벗어나면 마지막 해당 요일로 조정
      const newMonthEnd = new Date(targetYear, targetMonth + 1, 0)
      if (newDate > newMonthEnd) {
        // 마지막 해당 요일 찾기
        const lastDayOfWeek = getDay(newMonthEnd)
        let daysToSubtract = 0
        if (lastDayOfWeek >= oldDayOfWeek) {
          daysToSubtract = lastDayOfWeek - oldDayOfWeek
        } else {
          daysToSubtract = 7 - (oldDayOfWeek - lastDayOfWeek)
        }
        return addDays(newMonthEnd, -daysToSubtract)
      }
      
      return newDate
    }

    // 같은 요일 기준으로 날짜를 새 월로 변경
    const newSchedules = schedulesToCopy.map(schedule => {
      const oldDate = schedule.date
      const newDate = getSameWeekdayInMonth(oldDate, toYear, toMonth)
      
      // 새 날짜가 공휴일이면 null 반환 (필터링됨)
      if (isHoliday(newDate)) {
        return null
      }
      
      return {
        ...schedule,
        id: `${schedule.id}_${Date.now()}_${Math.random()}`, // 새로운 ID 생성
        date: format(newDate, 'yyyy-MM-dd'),
        startDate: schedule.startDate ? (() => {
          const oldStart = typeof schedule.startDate === 'string' ? parseISO(schedule.startDate) : new Date(schedule.startDate)
          const oldDateObj = typeof oldDate === 'string' ? parseISO(oldDate) : new Date(oldDate)
          
          // 시작일도 같은 요일 기준으로 변환
          const newStart = getSameWeekdayInMonth(schedule.startDate, toYear, toMonth)
          
          // 시작일과 원래 날짜의 요일 차이를 고려하여 조정
          const oldDaysDiff = Math.floor((oldStart - oldDateObj) / (1000 * 60 * 60 * 24))
          const adjustedStart = addDays(newDate, oldDaysDiff)
          
          // 조정된 날짜가 새 달 범위를 벗어나면 같은 요일 기준으로 재계산
          const newMonthStart = new Date(toYear, toMonth, 1)
          const newMonthEnd = new Date(toYear, toMonth + 1, 0)
          if (adjustedStart < newMonthStart || adjustedStart > newMonthEnd) {
            const recalculatedStart = getSameWeekdayInMonth(schedule.startDate, toYear, toMonth)
            // 공휴일이면 null 반환
            if (isHoliday(recalculatedStart)) {
              return null
            }
            return format(recalculatedStart, 'yyyy-MM-dd')
          }
          
          // 공휴일이면 null 반환
          if (isHoliday(adjustedStart)) {
            return null
          }
          
          return format(adjustedStart, 'yyyy-MM-dd')
        })() : null,
        endDate: schedule.endDate ? (() => {
          const oldEnd = typeof schedule.endDate === 'string' ? parseISO(schedule.endDate) : new Date(schedule.endDate)
          const oldDateObj = typeof oldDate === 'string' ? parseISO(oldDate) : new Date(oldDate)
          
          // 종료일도 같은 요일 기준으로 변환
          const newEnd = getSameWeekdayInMonth(schedule.endDate, toYear, toMonth)
          
          // 종료일과 원래 날짜의 요일 차이를 고려하여 조정
          const oldDaysDiff = Math.floor((oldEnd - oldDateObj) / (1000 * 60 * 60 * 24))
          const adjustedEnd = addDays(newDate, oldDaysDiff)
          
          // 조정된 날짜가 새 달 범위를 벗어나면 같은 요일 기준으로 재계산
          const newMonthStart = new Date(toYear, toMonth, 1)
          const newMonthEnd = new Date(toYear, toMonth + 1, 0)
          if (adjustedEnd < newMonthStart || adjustedEnd > newMonthEnd) {
            const recalculatedEnd = getSameWeekdayInMonth(schedule.endDate, toYear, toMonth)
            // 공휴일이면 null 반환
            if (isHoliday(recalculatedEnd)) {
              return null
            }
            return format(recalculatedEnd, 'yyyy-MM-dd')
          }
          
          // 공휴일이면 null 반환
          if (isHoliday(adjustedEnd)) {
            return null
          }
          
          return format(adjustedEnd, 'yyyy-MM-dd')
        })() : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    }).filter(schedule => schedule !== null) // null인 일정 제거 (공휴일)

    // 새 일정 저장
    for (const schedule of newSchedules) {
      await saveSchedule(schedule)
    }

    return newSchedules.length
  } catch (error) {
    console.error('전월 일정 복사 오류:', error)
    throw error
  }
}

