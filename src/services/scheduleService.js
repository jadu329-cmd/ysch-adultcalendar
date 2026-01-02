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
import { format } from 'date-fns'
import { initialSchedules } from '../data/initialSchedules'

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
    
    querySnapshot.forEach((doc) => {
      const schedule = { id: doc.id, ...doc.data() }
      const date = schedule.date
      if (!schedulesByDate[date]) {
        schedulesByDate[date] = []
      }
      schedulesByDate[date].push(schedule)
    })

    // 기간 일정도 포함 (시작일이 해당 월에 포함되거나, 종료일이 해당 월에 포함되는 경우)
    const allSchedules = query(schedulesRef, orderBy('date', 'asc'))
    const allSnapshot = await getDocs(allSchedules)
    
    allSnapshot.forEach((doc) => {
      const schedule = { id: doc.id, ...doc.data() }
      if (schedule.startDate && schedule.endDate) {
        const start = new Date(schedule.startDate)
        const end = new Date(schedule.endDate)
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0)
        
        // 기간 일정이 해당 월과 겹치는지 확인
        if ((start <= monthEnd && end >= monthStart)) {
          // 기간 내의 각 날짜에 추가
          const current = new Date(Math.max(start, monthStart))
          const last = new Date(Math.min(end, monthEnd))
          
          while (current <= last) {
            const dateStr = format(current, 'yyyy-MM-dd')
            if (!schedulesByDate[dateStr]) {
              schedulesByDate[dateStr] = []
            }
            // 이미 추가되지 않은 경우만 추가
            if (!schedulesByDate[dateStr].some(s => s.id === schedule.id)) {
              schedulesByDate[dateStr].push(schedule)
            }
            current.setDate(current.getDate() + 1)
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
    
    // 모든 일정을 평면 배열로 변환
    Object.values(fromSchedules).forEach(dateSchedules => {
      dateSchedules.forEach(schedule => {
        // 이미 추가되지 않은 경우만 추가 (중복 방지)
        if (!schedulesToCopy.find(s => s.id === schedule.id)) {
          schedulesToCopy.push(schedule)
        }
      })
    })

    // 날짜를 새 월로 변경
    const newSchedules = schedulesToCopy.map(schedule => {
      const oldDate = new Date(schedule.date)
      const dayOfMonth = oldDate.getDate()
      
      // 새 월의 해당 일자로 변경
      const newDate = new Date(toYear, toMonth, dayOfMonth)
      
      return {
        ...schedule,
        id: `${schedule.id}_${Date.now()}_${Math.random()}`, // 새로운 ID 생성
        date: format(newDate, 'yyyy-MM-dd'),
        startDate: schedule.startDate ? (() => {
          const oldStart = new Date(schedule.startDate)
          const daysDiff = Math.floor((oldStart - oldDate) / (1000 * 60 * 60 * 24))
          const newStart = new Date(toYear, toMonth, dayOfMonth + daysDiff)
          return format(newStart, 'yyyy-MM-dd')
        })() : null,
        endDate: schedule.endDate ? (() => {
          const oldEnd = new Date(schedule.endDate)
          const daysDiff = Math.floor((oldEnd - oldDate) / (1000 * 60 * 60 * 24))
          const newEnd = new Date(toYear, toMonth, dayOfMonth + daysDiff)
          return format(newEnd, 'yyyy-MM-dd')
        })() : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    })

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

