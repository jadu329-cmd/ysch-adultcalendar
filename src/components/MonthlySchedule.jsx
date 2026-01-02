import React, { useState, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths, parseISO } from 'date-fns'
import { getSchedulesByMonth, saveSchedule, deleteSchedule, copyPreviousMonthSchedules, initializeInitialSchedules, getAllSchedules } from '../services/scheduleService'
import { isHoliday } from '../data/holidays'
import './MonthlySchedule.css'

// 색상 옵션 (디자인 시스템에 맞게 업데이트)
const COLOR_OPTIONS = [
  { id: 'yellow', name: '연한 노랑', bg: '#fff4cc', text: '#000' },
  { id: 'grey', name: '회색', bg: '#e8e8e8', text: '#000' },
  { id: 'blue', name: '연한 파랑', bg: '#cce5ff', text: '#000' },
  { id: 'darkblue', name: '진한 파랑', bg: '#4a86e8', text: '#fff' },
  { id: 'orange', name: '연한 주황', bg: '#ffd9b3', text: '#000' },
  { id: 'pink', name: '연한 핑크', bg: '#ffccdd', text: '#000' },
  { id: 'pinkred', name: '진한 핑크', bg: '#ff99aa', text: '#fff' },
  { id: 'green', name: '연한 녹색', bg: '#d4edda', text: '#000' },
  { id: 'brightyellow', name: '밝은 노랑', bg: '#ffeb99', text: '#000' }
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
  const [excludeFromImageCopy, setExcludeFromImageCopy] = useState(false) // 임원모임/심방 체크박스
  const calendarRef = useRef(null)

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
    setExcludeFromImageCopy(false)
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
    setExcludeFromImageCopy(schedule.excludeFromImageCopy || false)
    setShowModal(true)
  }

  const handleScheduleContextMenu = async (e, schedule) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) {
      try {
        // 기간 일정인 경우 모든 관련 일정 삭제
        if (schedule.startDate && schedule.endDate && schedule.startDate !== schedule.endDate) {
          // 모든 일정 가져와서 같은 기간 일정 찾기
          const allSchedules = await getAllSchedules()
          const schedulesToDelete = allSchedules.filter(s => 
            s.startDate === schedule.startDate && 
            s.endDate === schedule.endDate &&
            s.title === schedule.title
          )
          
          for (const scheduleToDelete of schedulesToDelete) {
            await deleteSchedule(scheduleToDelete.id)
          }
        } else {
          await deleteSchedule(schedule.id)
        }
        
        await loadSchedules()
      } catch (error) {
        console.error('일정 삭제 오류:', error)
        alert('일정 삭제 중 오류가 발생했습니다.')
      }
    }
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
          if (selectedSchedule.startDate && selectedSchedule.endDate && selectedSchedule.startDate !== selectedSchedule.endDate) {
            const allExistingSchedules = await getAllSchedules()
            const schedulesToDelete = allExistingSchedules.filter(s => 
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
              color: scheduleColor,
              excludeFromImageCopy: excludeFromImageCopy
            })
            current.setDate(current.getDate() + 1)
          }
        } else {
          // 단일 일정 수정 (기존에 기간 일정이었던 경우 모든 관련 일정 삭제)
          if (selectedSchedule.startDate && selectedSchedule.endDate && selectedSchedule.startDate !== selectedSchedule.endDate) {
            const allExistingSchedules = await getAllSchedules()
            const schedulesToDelete = allExistingSchedules.filter(s => 
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
            color: scheduleColor,
            excludeFromImageCopy: excludeFromImageCopy
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
              color: scheduleColor,
              excludeFromImageCopy: excludeFromImageCopy
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
            color: scheduleColor,
            excludeFromImageCopy: excludeFromImageCopy
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
        if (selectedSchedule.startDate && selectedSchedule.endDate && selectedSchedule.startDate !== selectedSchedule.endDate) {
          const allExistingSchedules = await getAllSchedules()
          const schedulesToDelete = allExistingSchedules.filter(s => 
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
        const oldEnd = new Date(draggedSchedule.endDate)
        const oldDate = new Date(draggedSchedule.date)
        const oldDateStr = format(oldDate, 'yyyy-MM-dd')
        
        // 드래그한 날짜가 시작일인지 종료일인지 판단
        const isStartDate = oldDateStr === draggedSchedule.startDate
        const isEndDate = oldDateStr === draggedSchedule.endDate
        
        let newStart = new Date(oldStart)
        let newEnd = new Date(oldEnd)
        
        if (isStartDate) {
          // 시작일을 드래그: 시작일만 변경, 종료일은 고정
          newStart = new Date(targetDate)
        } else if (isEndDate) {
          // 종료일을 드래그: 시작일은 고정, 종료일만 변경
          newEnd = new Date(targetDate)
        } else {
          // 중간 날짜를 드래그: 전체 기간 이동 (기존 로직)
          const daysDiff = Math.floor((oldDate - oldStart) / (1000 * 60 * 60 * 24))
          newStart = new Date(targetDate)
          newStart.setDate(newStart.getDate() - daysDiff)
          const periodLength = Math.floor((oldEnd - oldStart) / (1000 * 60 * 60 * 24))
          newEnd = new Date(newStart)
          newEnd.setDate(newEnd.getDate() + periodLength)
        }
        
        // 시작일이 종료일보다 늦으면 안 됨 (문자열로 비교)
        const newStartStr = format(newStart, 'yyyy-MM-dd')
        const newEndStr = format(newEnd, 'yyyy-MM-dd')
        if (newStartStr > newEndStr) {
          alert('시작일은 종료일보다 늦을 수 없습니다.')
          setDraggedSchedule(null)
          return
        }

        // 기존 일정들 모두 삭제 (모든 일정에서 찾기)
        const allExistingSchedules = await getAllSchedules()
        const schedulesToDelete = allExistingSchedules.filter(s => 
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
            endDate: null,
            excludeFromImageCopy: draggedSchedule.excludeFromImageCopy || false
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

  const handleCopyCalendarImage = async () => {
    if (!calendarRef.current) return

    try {
      // html2canvas를 동적으로 import
      const html2canvas = (await import('html2canvas')).default

      // excludeFromImageCopy가 true인 일정들을 숨기기
      const allScheduleItems = calendarRef.current.querySelectorAll('.schedule-item')
      const itemsToHide = []
      
      allScheduleItems.forEach(item => {
        const scheduleId = item.getAttribute('data-schedule-id')
        const dateStr = item.getAttribute('data-date')
        if (scheduleId && dateStr) {
          const daySchedules = schedules[dateStr] || []
          const schedule = daySchedules.find(s => s.id === scheduleId)
          if (schedule && schedule.excludeFromImageCopy) {
            item.style.display = 'none'
            itemsToHide.push(item)
          }
        }
      })

      // 캘린더를 이미지로 변환
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      })

      // 클립보드에 복사
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.')
          // 숨긴 아이템들을 다시 표시
          itemsToHide.forEach(item => {
            item.style.display = ''
          })
          return
        }

        // 클립보드 API 사용 시도
        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            alert('달력 이미지가 클립보드에 복사되었습니다.')
            // 숨긴 아이템들을 다시 표시
            itemsToHide.forEach(item => {
              item.style.display = ''
            })
          }).catch(() => {
            // 클립보드 API가 실패하면 데이터 URL로 대체
            const dataUrl = canvas.toDataURL('image/png')
            const link = document.createElement('a')
            link.download = `calendar-${format(currentMonth, 'yyyy-MM')}.png`
            link.href = dataUrl
            link.click()
            alert('달력 이미지 다운로드가 시작됩니다.')
            // 숨긴 아이템들을 다시 표시
            itemsToHide.forEach(item => {
              item.style.display = ''
            })
          })
        } else {
          // 클립보드 API가 지원되지 않으면 데이터 URL로 대체
          const dataUrl = canvas.toDataURL('image/png')
          const link = document.createElement('a')
          link.download = `calendar-${format(currentMonth, 'yyyy-MM')}.png`
          link.href = dataUrl
          link.click()
          alert('달력 이미지 다운로드가 시작됩니다.')
          // 숨긴 아이템들을 다시 표시
          itemsToHide.forEach(item => {
            item.style.display = ''
          })
        }
      }, 'image/png')

    } catch (error) {
      console.error('달력 이미지 복사 오류:', error)
      alert('달력 이미지 복사 중 오류가 발생했습니다.')
      // 오류 발생 시에도 숨긴 아이템들을 다시 표시
      const allScheduleItems = calendarRef.current?.querySelectorAll('.schedule-item') || []
      allScheduleItems.forEach(item => {
        if (item.style.display === 'none') {
          item.style.display = ''
        }
      })
    }
  }


  const getSchedulesForDate = (date, excludeFromCopy = false) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    let daySchedules = schedules[dateStr] || []
    
    // excludeFromImageCopy가 true인 일정 필터링 (이미지 복사 시에만)
    if (excludeFromCopy) {
      daySchedules = daySchedules.filter(s => !s.excludeFromImageCopy)
    }
    
    // 연속일정(기간 일정)을 우선순위로 정렬 (맨 위에 표시)
    return daySchedules.sort((a, b) => {
      const aIsPeriod = a.startDate && a.endDate
      const bIsPeriod = b.startDate && b.endDate
      
      if (aIsPeriod && !bIsPeriod) return -1 // a가 기간일정이면 위로
      if (!aIsPeriod && bIsPeriod) return 1  // b가 기간일정이면 위로
      return 0 // 둘 다 같으면 순서 유지
    })
  }

  const getColorStyle = (colorId) => {
    if (!colorId) {
      return {
        backgroundColor: COLOR_OPTIONS[0].bg,
        color: COLOR_OPTIONS[0].text
      }
    }
    
    // 이전 색상 ID와의 호환성 처리
    const colorIdMap = {
      'gray': 'grey',
      'dark-blue': 'darkblue'
    }
    
    const mappedColorId = colorIdMap[colorId] || colorId
    const color = COLOR_OPTIONS.find(c => c.id === mappedColorId) || COLOR_OPTIONS[0]
    
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
          <button className="action-btn copy-image" onClick={handleCopyCalendarImage}>
            <span>📅</span>
            달력 이미지 복사 (심방/임원모임 제외)
          </button>
          
          <button className="action-btn copy-month" onClick={handleCopyPreviousMonth}>
            <span>📋</span>
            전월 일정 복사
          </button>
        </div>
      </div>

      <div className="calendar-container" ref={calendarRef}>
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
                  {daySchedules.map(schedule => {
                    // 연속일정인 경우 제목 뒤에 (DD-DD) 형식 추가
                    let displayTitle = schedule.title
                    if (schedule.startDate && schedule.endDate && schedule.startDate !== schedule.endDate) {
                      const startDay = format(parseISO(schedule.startDate), 'd')
                      const endDay = format(parseISO(schedule.endDate), 'd')
                      displayTitle = `${schedule.title} (${startDay}-${endDay})`
                    }
                    
                    return (
                      <div
                        key={schedule.id}
                        className="schedule-item"
                        style={getColorStyle(schedule.color)}
                        onClick={(e) => handleScheduleClick(e, schedule)}
                        onContextMenu={(e) => handleScheduleContextMenu(e, schedule)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, schedule)}
                        title="좌클릭: 수정, 우클릭: 삭제"
                        data-schedule-id={schedule.id}
                        data-date={dateStr}
                      >
                        {displayTitle}
                      </div>
                    )
                  })}
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

            <div className="modal-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={excludeFromImageCopy}
                  onChange={(e) => setExcludeFromImageCopy(e.target.checked)}
                />
                <span>달력 이미지 복사 시 제외 (심방/임원모임)</span>
              </label>
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

