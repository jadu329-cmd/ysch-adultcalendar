import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths, parseISO } from 'date-fns'
import { getSchedulesByMonth, saveSchedule, deleteSchedule, copyPreviousMonthSchedules, initializeInitialSchedules } from '../services/scheduleService'
import { isHoliday } from '../data/holidays'
import './MonthlySchedule.css'

// 색상 옵션
const COLOR_OPTIONS = [
  { id: 'gray', name: '회색', bg: '#e5e5e5', text: '#333' },
  { id: 'yellow', name: '노란색', bg: '#fff9c4', text: '#333' },
  { id: 'green', name: '초록색', bg: '#c8e6c9', text: '#333' },
  { id: 'blue', name: '파란색', bg: '#bbdefb', text: '#333' },
  { id: 'orange', name: '주황색', bg: '#ffe0b2', text: '#333' },
  { id: 'pink', name: '분홍색', bg: '#f8bbd0', text: '#333' },
  { id: 'dark-blue', name: '진한 파란색', bg: '#90caf9', text: '#333' },
  { id: 'light-gray', name: '연한 회색', bg: '#f5f5f5', text: '#333' },
  { id: 'light-green', name: '연한 초록색', bg: '#dcedc8', text: '#333' }
]

const MonthlySchedule = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 11, 1)) // 2025년 12월
  const [schedules, setSchedules] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [draggedSchedule, setDraggedSchedule] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleColor, setScheduleColor] = useState(COLOR_OPTIONS[0].id)

  // 초기 데이터 로드 (한 번만) 및 월별 일정 로드
  useEffect(() => {
    const init = async () => {
      await initializeInitialSchedules()
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const monthSchedules = await getSchedulesByMonth(year, month)
      setSchedules(monthSchedules)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  const loadSchedules = async () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const monthSchedules = await getSchedulesByMonth(year, month)
    setSchedules(monthSchedules)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart)
  const emptyDays = Array(startDay).fill(null)

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    setSelectedSchedule(null)
    const dateStr = format(date, 'yyyy-MM-dd')
    setStartDate(dateStr)
    setEndDate(dateStr)
    setScheduleTitle('')
    setScheduleColor(COLOR_OPTIONS[0].id)
    setShowModal(true)
  }

  const handleScheduleClick = (e, schedule) => {
    e.stopPropagation()
    setSelectedSchedule(schedule)
    setSelectedDate(parseISO(schedule.date))
    setStartDate(schedule.startDate || schedule.date)
    setEndDate(schedule.endDate || schedule.date)
    setScheduleTitle(schedule.title)
    setScheduleColor(schedule.color || COLOR_OPTIONS[0].id)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!scheduleTitle.trim()) {
      alert('일정 제목을 입력해주세요.')
      return
    }

    // 종료일이 시작일과 다르면 자동으로 기간 일정으로 처리
    const isPeriodSchedule = startDate && endDate && startDate !== endDate

    try {
      if (selectedSchedule) {
        // 수정
        if (isPeriodSchedule) {
          // 기간 일정 삭제 후 재생성 (기존 일정의 모든 관련 일정 삭제)
          if (selectedSchedule.startDate && selectedSchedule.endDate) {
            const allSchedules = await getSchedulesByMonth(
              currentMonth.getFullYear(),
              currentMonth.getMonth()
            )
            const schedulesToDelete = Object.values(allSchedules)
              .flat()
              .filter(s => 
                s.startDate === selectedSchedule.startDate && 
                s.endDate === selectedSchedule.endDate &&
                s.title === selectedSchedule.title
              )
            
            for (const schedule of schedulesToDelete) {
              await deleteSchedule(schedule.id)
            }
          } else {
            await deleteSchedule(selectedSchedule.id)
          }
          const start = new Date(startDate)
          const end = new Date(endDate)
          const current = new Date(start)
          
          while (current <= end) {
            const scheduleId = `${Date.now()}_${Math.random()}`
            await saveSchedule({
              id: scheduleId,
              title: scheduleTitle,
              date: format(current, 'yyyy-MM-dd'),
              startDate: format(start, 'yyyy-MM-dd'),
              endDate: format(end, 'yyyy-MM-dd'),
              color: scheduleColor
            })
            current.setDate(current.getDate() + 1)
          }
        } else {
          // 단일 일정 수정 (기존에 기간 일정이었던 경우 모든 관련 일정 삭제)
          if (selectedSchedule.startDate && selectedSchedule.endDate) {
            const allSchedules = await getSchedulesByMonth(
              currentMonth.getFullYear(),
              currentMonth.getMonth()
            )
            const schedulesToDelete = Object.values(allSchedules)
              .flat()
              .filter(s => 
                s.startDate === selectedSchedule.startDate && 
                s.endDate === selectedSchedule.endDate &&
                s.title === selectedSchedule.title
              )
            
            for (const schedule of schedulesToDelete) {
              await deleteSchedule(schedule.id)
            }
          } else {
            await deleteSchedule(selectedSchedule.id)
          }
          
          // 새로운 단일 일정 저장
          const scheduleId = `${Date.now()}_${Math.random()}`
          await saveSchedule({
            id: scheduleId,
            title: scheduleTitle,
            date: startDate,
            startDate: null,
            endDate: null,
            color: scheduleColor
          })
        }
      } else {
        // 추가
        if (isPeriodSchedule) {
          // 기간 일정
          const start = new Date(startDate)
          const end = new Date(endDate)
          const current = new Date(start)
          
          while (current <= end) {
            const scheduleId = `${Date.now()}_${Math.random()}`
            await saveSchedule({
              id: scheduleId,
              title: scheduleTitle,
              date: format(current, 'yyyy-MM-dd'),
              startDate: format(start, 'yyyy-MM-dd'),
              endDate: format(end, 'yyyy-MM-dd'),
              color: scheduleColor
            })
            current.setDate(current.getDate() + 1)
          }
        } else {
          // 단일 일정
          const scheduleId = `${Date.now()}_${Math.random()}`
          await saveSchedule({
            id: scheduleId,
            title: scheduleTitle,
            date: startDate,
            startDate: null,
            endDate: null,
            color: scheduleColor
          })
        }
      }
      
      await loadSchedules()
      setShowModal(false)
    } catch (error) {
      console.error('일정 저장 오류:', error)
      alert('일정 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!selectedSchedule) return
    
    if (window.confirm('일정을 삭제하시겠습니까?')) {
      try {
        // 기간 일정인 경우 모든 관련 일정 삭제
        if (selectedSchedule.startDate && selectedSchedule.endDate) {
          const allSchedules = await getSchedulesByMonth(
            currentMonth.getFullYear(),
            currentMonth.getMonth()
          )
          const schedulesToDelete = Object.values(allSchedules)
            .flat()
            .filter(s => 
              s.startDate === selectedSchedule.startDate && 
              s.endDate === selectedSchedule.endDate &&
              s.title === selectedSchedule.title
            )
          
          for (const schedule of schedulesToDelete) {
            await deleteSchedule(schedule.id)
          }
        } else {
          await deleteSchedule(selectedSchedule.id)
        }
        
        await loadSchedules()
        setShowModal(false)
      } catch (error) {
        console.error('일정 삭제 오류:', error)
        alert('일정 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const handleDragStart = (e, schedule) => {
    setDraggedSchedule(schedule)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetDate) => {
    e.preventDefault()
    if (!draggedSchedule) return

    try {
      const newDateStr = format(targetDate, 'yyyy-MM-dd')
      
      // 기간 일정인 경우
      if (draggedSchedule.startDate && draggedSchedule.endDate) {
        const oldStart = new Date(draggedSchedule.startDate)
        const oldDate = new Date(draggedSchedule.date)
        const daysDiff = Math.floor((oldDate - oldStart) / (1000 * 60 * 60 * 24))
        
        const newStart = new Date(targetDate)
        newStart.setDate(newStart.getDate() - daysDiff)
        const newEnd = new Date(newStart)
        const periodLength = Math.floor((new Date(draggedSchedule.endDate) - oldStart) / (1000 * 60 * 60 * 24))
        newEnd.setDate(newEnd.getDate() + periodLength)

        // 기존 일정들 모두 삭제
        const allSchedules = await getSchedulesByMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth()
        )
        const schedulesToDelete = Object.values(allSchedules)
          .flat()
          .filter(s => 
            s.startDate === draggedSchedule.startDate && 
            s.endDate === draggedSchedule.endDate &&
            s.title === draggedSchedule.title
          )
        
        for (const schedule of schedulesToDelete) {
          await deleteSchedule(schedule.id)
        }

        // 새 위치에 일정들 생성
        const current = new Date(newStart)
        while (current <= newEnd) {
          const scheduleId = `${Date.now()}_${Math.random()}`
          await saveSchedule({
            id: scheduleId,
            title: draggedSchedule.title,
            date: format(current, 'yyyy-MM-dd'),
            startDate: format(newStart, 'yyyy-MM-dd'),
            endDate: format(newEnd, 'yyyy-MM-dd'),
            color: draggedSchedule.color
          })
          current.setDate(current.getDate() + 1)
        }
      } else {
        // 단일 일정
        await saveSchedule({
          ...draggedSchedule,
          date: newDateStr,
          startDate: null,
          endDate: null
        })
      }
      
      await loadSchedules()
      setDraggedSchedule(null)
    } catch (error) {
      console.error('일정 이동 오류:', error)
      alert('일정 이동 중 오류가 발생했습니다.')
    }
  }


  const handleCopyPreviousMonth = async () => {
    const fromMonth = subMonths(currentMonth, 1)
    const fromYear = fromMonth.getFullYear()
    const fromMonthIndex = fromMonth.getMonth()
    const toYear = currentMonth.getFullYear()
    const toMonthIndex = currentMonth.getMonth()

    if (window.confirm(`${fromYear}년 ${fromMonthIndex + 1}월의 일정을 현재 월로 복사하시겠습니까?`)) {
      try {
        const count = await copyPreviousMonthSchedules(fromYear, fromMonthIndex, toYear, toMonthIndex)
        await loadSchedules()
        alert(`${count}개의 일정이 복사되었습니다.`)
      } catch (error) {
        console.error('전월 복사 오류:', error)
        alert('전월 일정 복사 중 오류가 발생했습니다.')
      }
    }
  }


  const getSchedulesForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return schedules[dateStr] || []
  }

  const getColorStyle = (colorId) => {
    const color = COLOR_OPTIONS.find(c => c.id === colorId) || COLOR_OPTIONS[0]
    return {
      backgroundColor: color.bg,
      color: color.text
    }
  }

  const today = new Date()

  return (
    <div className="monthly-schedule">
      <div className="schedule-header">
        <h1 className="schedule-title">
          <span className="title-icon">🏢</span>
          부서 월간 일정
        </h1>
        
        <div className="action-buttons">
          <button className="action-btn copy-image" disabled>
            <span>📅</span>
            달력 이미지 복사 (심방/임원모임 제외)
          </button>
          
          <button className="action-btn copy-month" onClick={handleCopyPreviousMonth}>
            <span>📋</span>
            전월 일정 복사
          </button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>
            ‹
          </button>
          <h2 className="calendar-month">
            {format(currentMonth, 'yyyy년 MM월')}
          </h2>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {weekDays.map(day => (
            <div key={day} className={`calendar-weekday ${day === '일' ? 'sunday' : ''} ${day === '토' ? 'saturday' : ''}`}>
              {day}
            </div>
          ))}
          
          {emptyDays.map((_, index) => {
            const prevMonthDate = new Date(monthStart)
            prevMonthDate.setDate(prevMonthDate.getDate() - (emptyDays.length - index))
            return (
              <div 
                key={`empty-${index}`} 
                className="calendar-day empty"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, prevMonthDate)}
              />
            )
          })}
          
          {days.map(day => {
            const daySchedules = getSchedulesForDate(day)
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayOfWeek = getDay(day) // 0: 일요일, 6: 토요일
            const isSaturday = dayOfWeek === 6
            const isSunday = dayOfWeek === 0
            const isHolidayDay = isHoliday(day)
            
            return (
              <div
                key={dateStr}
                className={`calendar-day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''} ${isSaturday ? 'saturday' : ''} ${(isSunday || isHolidayDay) ? 'sunday-or-holiday' : ''}`}
                onClick={() => handleDateClick(day)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`day-number ${isSaturday ? 'saturday' : ''} ${(isSunday || isHolidayDay) ? 'sunday-or-holiday' : ''}`}>{format(day, 'd')}</div>
                <div className="day-schedules">
                  {daySchedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className="schedule-item"
                      style={getColorStyle(schedule.color)}
                      onClick={(e) => handleScheduleClick(e, schedule)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, schedule)}
                    >
                      {schedule.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedSchedule ? '일정 수정' : '일정 추가'}</h3>
            
            <div className="modal-field">
              <label>제목</label>
              <input
                type="text"
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
              />
            </div>

            <div className="modal-field">
              <label>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value
                  setStartDate(newStartDate)
                  // 시작일이 종료일보다 늦으면 종료일도 함께 변경
                  if (newStartDate > endDate) {
                    setEndDate(newStartDate)
                  }
                }}
              />
            </div>
            <div className="modal-field">
              <label>종료일 (선택사항)</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {startDate && endDate && startDate !== endDate && (
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                  기간 일정으로 저장됩니다 ({startDate} ~ {endDate})
                </p>
              )}
            </div>

            <div className="modal-field">
              <label>색상</label>
              <div className="color-options">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.id}
                    className={`color-option ${scheduleColor === color.id ? 'selected' : ''}`}
                    style={{ backgroundColor: color.bg }}
                    onClick={() => setScheduleColor(color.id)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              {selectedSchedule && (
                <button className="btn-delete" onClick={handleDelete}>
                  삭제
                </button>
              )}
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                취소
              </button>
              <button className="btn-save" onClick={handleSave}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlySchedule

