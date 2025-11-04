"use client"

import React from "react"

import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Plus, ChevronDown, ChevronUp, X } from "lucide-react"

export default function CalendarPage() {
  const [selectedView, setSelectedView] = useState<"月" | "5日" | "3日" | "ToDo">("月")
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)) // October 2025
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null)

  const [appointments, setAppointments] = useState<
    Array<{
      id: number
      title: string
      startDate: string // Format: "2025-10-06T16:00"
      endDate: string // Format: "2025-10-06T17:00"
      location: string
      memo: string
    }>
  >([])

  const [todos, setTodos] = useState([
    { id: 1, checked: true, title: "OO授業の課題", deadline: "10/7 23:55", memo: "" },
    { id: 2, checked: false, title: "XX授業の振り返り", deadline: "10/6 16:00", memo: "" },
  ])
  const [sortColumn, setSortColumn] = useState<"title" | "deadline" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ title: "", deadline: "", memo: "" })
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ title: "", deadline: "", memo: "" })

  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false)
  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    location: "",
    memo: "",
  })

  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null)
  const [editAppointmentForm, setEditAppointmentForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    location: "",
    memo: "",
  })

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const [draggingAppointmentId, setDraggingAppointmentId] = useState<number | null>(null)
  const [dragStartY, setDragStartY] = useState<number>(0)
  const [dragCurrentY, setDragCurrentY] = useState<number>(0)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [dragCurrentX, setDragCurrentX] = useState<number>(0)
  const [dragOriginalDayIndex, setDragOriginalDayIndex] = useState<number>(0)
  const [dragOriginalStartDate, setDragOriginalStartDate] = useState<string>("")
  const [hasDragged, setHasDragged] = useState<boolean>(false)

  // Helper functions for appointment and todo indicators
  const hasAppointmentOnDate = (year: number, month: number, day: number): boolean => {
    return appointments.some((apt) => {
      const aptDate = new Date(apt.startDate)
      return aptDate.getFullYear() === year && aptDate.getMonth() === month && aptDate.getDate() === day
    })
  }

  const hasTodoOnDate = (year: number, month: number, day: number): boolean => {
    return todos.some((todo) => {
      const [datePart] = todo.deadline.split(" ")
      const [todoMonth, todoDay] = datePart.split("/").map(Number)
      return todoMonth - 1 === month && todoDay === day && year === currentDate.getFullYear()
    })
  }

  const getAppointmentsForDate = (year: number, month: number, day: number) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startDate)
      return aptDate.getFullYear() === year && aptDate.getMonth() === month && aptDate.getDate() === day
    })
  }

  const getTodaysAppointments = () => {
    const today = new Date()
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.startDate)
        return (
          aptDate.getFullYear() === today.getFullYear() &&
          aptDate.getMonth() === today.getMonth() &&
          aptDate.getDate() === today.getDate()
        )
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }

  const formatTimeFromDatetime = (datetime: string): string => {
    const date = new Date(datetime)
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }

  const getAppointmentPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const startHour = start.getHours()
    const startMinute = start.getMinutes()
    const endHour = end.getHours()
    const endMinute = end.getMinutes()

    // Calculate position (80px per hour slot, starting after 終日)
    const topPosition = (startHour + startMinute / 60) * 80 + 80 // +80 for 終日 slot
    const duration = endHour - startHour + (endMinute - startMinute) / 60
    const height = duration * 80

    return { top: topPosition, height: Math.max(height, 20) }
  }

  const getAppointmentLayout = (appointments: typeof appointments, dayAppointments: typeof appointments) => {
    // Check if two appointments overlap
    const doOverlap = (apt1: (typeof appointments)[0], apt2: (typeof appointments)[0]) => {
      const start1 = new Date(apt1.startDate).getTime()
      const end1 = new Date(apt1.endDate).getTime()
      const start2 = new Date(apt2.startDate).getTime()
      const end2 = new Date(apt2.endDate).getTime()

      return start1 < end2 && start2 < end1
    }

    // Sort appointments by start time, then by duration (longer first)
    const sortedAppointments = [...dayAppointments].sort((a, b) => {
      const startA = new Date(a.startDate).getTime()
      const startB = new Date(b.startDate).getTime()
      if (startA !== startB) return startA - startB

      // If same start time, longer appointments first
      const durationA = new Date(a.endDate).getTime() - startA
      const durationB = new Date(b.endDate).getTime() - startB
      return durationB - durationA
    })

    const appointmentColumns: { [key: number]: number } = {}
    const appointmentMaxColumns: { [key: number]: number } = {}

    sortedAppointments.forEach((apt) => {
      // Find all appointments that overlap with this one
      const overlappingApts = sortedAppointments.filter((other) => other.id !== apt.id && doOverlap(apt, other))

      // Find which columns are already taken by overlapping appointments
      const usedColumns = new Set<number>()
      overlappingApts.forEach((other) => {
        if (appointmentColumns[other.id] !== undefined) {
          usedColumns.add(appointmentColumns[other.id])
        }
      })

      // Find the first available column
      let column = 0
      while (usedColumns.has(column)) {
        column++
      }
      appointmentColumns[apt.id] = column

      // Calculate the maximum number of concurrent appointments
      // This is the number of overlapping appointments + 1 (this appointment)
      const maxConcurrent = overlappingApts.length + 1
      appointmentMaxColumns[apt.id] = maxConcurrent
    })

    // Now we need to ensure all overlapping appointments have the same max columns
    // Group appointments by their overlap groups
    const processedGroups = new Set<number>()

    sortedAppointments.forEach((apt) => {
      if (processedGroups.has(apt.id)) return

      // Find all appointments in this overlap group
      const group = new Set<number>([apt.id])
      const toProcess = [apt]

      while (toProcess.length > 0) {
        const current = toProcess.pop()!
        sortedAppointments.forEach((other) => {
          if (!group.has(other.id) && doOverlap(current, other)) {
            group.add(other.id)
            toProcess.push(other)
          }
        })
      }

      // Find the maximum column used in this group
      let maxColumn = 0
      group.forEach((id) => {
        maxColumn = Math.max(maxColumn, appointmentColumns[id] ?? 0)
      })

      // Set all appointments in this group to have the same max columns
      const groupMaxColumns = maxColumn + 1
      group.forEach((id) => {
        appointmentMaxColumns[id] = groupMaxColumns
        processedGroups.add(id)
      })
    })

    return { appointmentColumns, columnCount: appointmentMaxColumns }
  }

  const handleAppointmentDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    appointmentId: number,
    startDate: string,
    dayIndex: number,
  ) => {
    e.stopPropagation()
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX

    setDraggingAppointmentId(appointmentId)
    setDragStartY(clientY)
    setDragCurrentY(clientY)
    setDragStartX(clientX)
    setDragCurrentX(clientX)
    setDragOriginalDayIndex(dayIndex)
    setDragOriginalStartDate(startDate)
    setHasDragged(false)

    // Prevent text selection during drag
    document.body.style.userSelect = "none"
  }

  const handleAppointmentDragMove = (e: MouseEvent | TouchEvent) => {
    if (draggingAppointmentId === null) return

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX

    const rawDragOffsetY = clientY - dragStartY
    const rawDragOffsetX = clientX - dragStartX

    if (Math.abs(rawDragOffsetY) > 5 || Math.abs(rawDragOffsetX) > 5) {
      setHasDragged(true)
    }

    // Snap vertical movement to 15-minute increments
    const pixelsPer15Min = 20
    const snappedOffsetY = Math.round(rawDragOffsetY / pixelsPer15Min) * pixelsPer15Min

    setDragCurrentY(dragStartY + snappedOffsetY)
    setDragCurrentX(clientX)
  }

  const handleAppointmentDragEnd = () => {
    if (draggingAppointmentId === null) return

    const dragDeltaY = dragCurrentY - dragStartY
    const dragDeltaX = dragCurrentX - dragStartX

    // Calculate time change in 15-minute increments
    const pixelsPer15Min = 20
    const minutesChange = Math.round(dragDeltaY / pixelsPer15Min) * 15

    // Estimate day column width (approximate based on viewport)
    const dayColumnWidth = (window.innerWidth * 0.75) / (selectedView === "5日" ? 5 : 3) // Rough estimate
    const dayOffset = Math.round(dragDeltaX / dayColumnWidth)

    if (minutesChange !== 0 || dayOffset !== 0) {
      const appointment = appointments.find((apt) => apt.id === draggingAppointmentId)
      if (appointment) {
        const originalStart = new Date(dragOriginalStartDate)
        const originalEnd = new Date(appointment.endDate)
        const duration = originalEnd.getTime() - originalStart.getTime()

        const newStart = new Date(originalStart.getTime() + minutesChange * 60 * 1000)
        // Add day offset
        newStart.setDate(newStart.getDate() + dayOffset)
        const newEnd = new Date(newStart.getTime() + duration)

        // Format dates
        const formatDateTime = (date: Date) => {
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}T${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
        }

        // Update appointment
        setAppointments(
          appointments.map((apt) =>
            apt.id === draggingAppointmentId
              ? {
                  ...apt,
                  startDate: formatDateTime(newStart),
                  endDate: formatDateTime(newEnd),
                }
              : apt,
          ),
        )
      }
    }

    // Reset drag state
    setDraggingAppointmentId(null)
    setDragStartY(0)
    setDragCurrentY(0)
    setDragStartX(0)
    setDragCurrentX(0)
    setDragOriginalDayIndex(0)
    setDragOriginalStartDate("")

    setTimeout(() => {
      setHasDragged(false)
    }, 100)

    document.body.style.userSelect = ""
  }

  React.useEffect(() => {
    if (draggingAppointmentId !== null) {
      const handleMouseMove = (e: MouseEvent) => handleAppointmentDragMove(e)
      const handleTouchMove = (e: TouchEvent) => handleAppointmentDragMove(e)
      const handleMouseUp = () => handleAppointmentDragEnd()
      const handleTouchEnd = () => handleAppointmentDragEnd()

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("touchmove", handleTouchMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchend", handleTouchEnd)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [
    draggingAppointmentId,
    dragCurrentY,
    dragStartY,
    dragOriginalStartDate,
    appointments,
    dragCurrentX,
    dragStartX,
    dragOriginalDayIndex,
  ])

  const todaysAppointments = getTodaysAppointments()

  const handleSort = (column: "title" | "deadline") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedTodos = (todoList: typeof todos) => {
    if (!sortColumn) return todoList

    return [...todoList].sort((a, b) => {
      let compareA: string | number = ""
      let compareB: string | number = ""

      if (sortColumn === "title") {
        compareA = a.title
        compareB = b.title
      } else if (sortColumn === "deadline") {
        compareA = a.deadline
        compareB = b.deadline
      }

      if (compareA < compareB) return sortDirection === "asc" ? -1 : 1
      if (compareA > compareB) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }

  const activeTodos = getSortedTodos(todos.filter((todo) => !todo.checked))
  const completedTodos = getSortedTodos(todos.filter((todo) => todo.checked))

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const generateMiniCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    const weeks: number[][] = []
    let currentWeek: number[] = []

    // Fill previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      currentWeek.push(prevMonthLastDay - i)
    }

    // Fill current month days
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    // Fill next month days if needed
    if (currentWeek.length > 0) {
      let nextDay = 1
      while (currentWeek.length < 7) {
        currentWeek.push(nextDay++)
      }
      weeks.push(currentWeek)
    }

    return weeks
  }

  const generateMainCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    const weeks: string[][] = []
    let currentWeek: string[] = []

    // Fill previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      currentWeek.push(`${prevMonthLastDay - i}日`)
    }

    // Fill current month days
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(`${day}日`)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    // Fill next month days
    if (currentWeek.length > 0) {
      let nextDay = 1
      while (currentWeek.length < 7) {
        const nextMonth = month + 1
        const nextMonthName = nextMonth === 12 ? "1月" : ""
        currentWeek.push(nextMonthName ? `${nextMonthName}${nextDay}日` : `${nextDay}日`)
        nextDay++
      }
      weeks.push(currentWeek)
    }

    return weeks
  }

  const handleDateClick = (day: number, weekIndex: number, dayIndex: number) => {
    if (selectedView === "月" || selectedView === "ToDo") return // Only work for 5-day and 3-day views

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()

    // Calculate which month this day belongs to
    let targetMonth = month
    const targetDay = day

    if (weekIndex === 0 && dayIndex < startDay) {
      // Previous month
      targetMonth = month - 1
    } else if (weekIndex === generateMiniCalendar().length - 1 && day < 7) {
      // Next month
      targetMonth = month + 1
    }

    const clickedDate = new Date(year, targetMonth, targetDay)
    setSelectedStartDate(clickedDate)
  }

  const isDateInRange = (day: number, weekIndex: number, dayIndex: number) => {
    if (selectedView === "月" || selectedView === "ToDo") return false

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()

    let targetMonth = month
    const targetDay = day

    if (weekIndex === 0 && dayIndex < startDay) {
      targetMonth = month - 1
    } else if (weekIndex === generateMiniCalendar().length - 1 && day < 7) {
      targetMonth = month + 1
    }

    const checkDate = new Date(year, targetMonth, targetDay)

    // Get the displayed date range
    const displayedDates = selectedView === "5日" ? generateFiveDayDates() : generateThreeDayDates()
    const startDate = selectedStartDate || new Date(year, month, 1)

    // Check if this date is in the displayed range
    const daysToShow = selectedView === "5日" ? 5 : 3
    for (let i = 0; i < daysToShow; i++) {
      const rangeDate = new Date(startDate)
      rangeDate.setDate(startDate.getDate() + i)
      if (
        checkDate.getDate() === rangeDate.getDate() &&
        checkDate.getMonth() === rangeDate.getMonth() &&
        checkDate.getFullYear() === rangeDate.getFullYear()
      ) {
        return true
      }
    }
    return false
  }

  const generateFiveDayDates = () => {
    const startDate = selectedStartDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const weekDaysShort = ["日", "月", "火", "水", "木", "金", "土"]

    const dates = []
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push({
        day: `${date.getDate()}`,
        weekday: weekDaysShort[date.getDay()],
      })
    }
    return dates
  }

  const generateThreeDayDates = () => {
    const startDate = selectedStartDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const weekDaysShort = ["日", "月", "火", "水", "木", "金", "土"]

    const dates = []
    for (let i = 0; i < 3; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push({
        day: `${date.getDate()}`,
        weekday: weekDaysShort[date.getDay()],
      })
    }
    return dates
  }

  const miniCalendarDays = generateMiniCalendar()
  const mainCalendarDays = generateMainCalendar()
  const fiveDayDates = generateFiveDayDates()
  const threeDayDates = generateThreeDayDates()

  const timeSlots = [
    "終日",
    "0:00",
    "1:00",
    "2:00",
    "3:00",
    "4:00",
    "5:00",
    "6:00",
    "7:00",
    "8:00",
    "9:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
  ]

  const weekDaysShort = ["日", "月", "火", "水", "木", "金", "土"]
  const weekDaysFull = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"]

  const toggleTodo = (id: number) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, checked: !todo.checked } : todo)))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const startEditing = (todo: (typeof todos)[0]) => {
    setEditingId(todo.id)
    setEditForm({
      title: todo.title,
      deadline: todo.deadline,
      memo: todo.memo,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ title: "", deadline: "", memo: "" })
  }

  const saveEditing = () => {
    if (editingId !== null) {
      setTodos(
        todos.map((todo) =>
          todo.id === editingId
            ? {
                ...todo,
                title: editForm.title,
                deadline: editForm.deadline,
                memo: editForm.memo,
              }
            : todo,
        ),
      )
      setEditingId(null)
      setEditForm({ title: "", deadline: "", memo: "" })
    }
  }

  const startCreating = () => {
    const now = new Date()
    const defaultDeadline = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`
    setCreateForm({ title: "", deadline: defaultDeadline, memo: "" })
    setIsCreating(true)
  }

  const startCreatingAppointment = () => {
    const now = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const day = currentDate.getDate()

    // Default to current date at current hour
    const startDateTime = new Date(year, month, day, now.getHours(), 0)
    const endDateTime = new Date(year, month, day, now.getHours() + 1, 0)

    const startDateStr = `${startDateTime.getFullYear()}-${(startDateTime.getMonth() + 1).toString().padStart(2, "0")}-${startDateTime.getDate().toString().padStart(2, "0")}T${startDateTime.getHours().toString().padStart(2, "0")}:00`
    const endDateStr = `${endDateTime.getFullYear()}-${(endDateTime.getMonth() + 1).toString().padStart(2, "0")}-${endDateTime.getDate().toString().padStart(2, "0")}T${endDateTime.getHours().toString().padStart(2, "0")}:00`

    setAppointmentForm({
      title: "",
      startDate: startDateStr,
      endDate: endDateStr,
      location: "",
      memo: "",
    })
    setIsCreatingAppointment(true)
  }

  const cancelCreatingAppointment = () => {
    setIsCreatingAppointment(false)
    setAppointmentForm({ title: "", startDate: "", endDate: "", location: "", memo: "" })
  }

  const saveNewAppointment = () => {
    if (appointmentForm.title.trim() === "") return

    const newId = Math.max(...appointments.map((a) => a.id), 0) + 1
    const newAppointment = {
      id: newId,
      title: appointmentForm.title,
      startDate: appointmentForm.startDate,
      endDate: appointmentForm.endDate,
      location: appointmentForm.location,
      memo: appointmentForm.memo,
    }

    setAppointments([...appointments, newAppointment])
    setIsCreatingAppointment(false)
    setAppointmentForm({ title: "", startDate: "", endDate: "", location: "", memo: "" })
  }

  const cancelCreating = () => {
    setIsCreating(false)
    setCreateForm({ title: "", deadline: "", memo: "" })
  }

  const displayToDatetimeLocal = (displayDate: string): string => {
    // Format: "10/6 16:00" -> "2025-10-06T16:00"
    const [datePart, timePart] = displayDate.split(" ")
    const [month, day] = datePart.split("/")
    const year = currentDate.getFullYear()
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`
  }

  const datetimeLocalToDisplay = (datetimeLocal: string): string => {
    // Format: "2025-10-06T16:00" -> "10/6 16:00"
    const [datePart, timePart] = datetimeLocal.split("T")
    const [year, month, day] = datePart.split("-")
    return `${Number.parseInt(month)}/${Number.parseInt(day)} ${timePart}`
  }

  const getDeadlineUrgency = (deadline: string): "overdue" | "urgent" | "warning" | "normal" => {
    // Parse deadline format: "10/6 16:00"
    const [datePart, timePart] = deadline.split(" ")
    const [month, day] = datePart.split("/").map(Number)
    const [hour, minute] = timePart.split(":").map(Number)

    const year = currentDate.getFullYear()
    const deadlineDate = new Date(year, month - 1, day, hour, minute)
    const now = new Date()

    const diffMs = deadlineDate.getTime() - now.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 0) {
      return "overdue" // Past deadline - show OVER
    } else if (diffHours <= 24) {
      return "urgent" // Within 1 day - red
    } else if (diffHours <= 72) {
      return "warning" // Within 3 days - dark orange
    }
    return "normal"
  }

  const saveNewTask = () => {
    if (createForm.title.trim() === "") return

    const newId = Math.max(...todos.map((t) => t.id), 0) + 1
    const newTodo = {
      id: newId,
      checked: false,
      title: createForm.title,
      deadline: createForm.deadline,
      memo: createForm.memo,
    }

    setTodos([...todos, newTodo])
    setIsCreating(false)
    setCreateForm({ title: "", deadline: "", memo: "" })
  }

  const startEditingAppointment = (appointment: (typeof appointments)[0]) => {
    setEditingAppointmentId(appointment.id)
    setEditAppointmentForm({
      title: appointment.title,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      location: appointment.location,
      memo: appointment.memo,
    })
  }

  const cancelEditingAppointment = () => {
    setEditingAppointmentId(null)
    setEditAppointmentForm({ title: "", startDate: "", endDate: "", location: "", memo: "" })
  }

  const saveEditingAppointment = () => {
    if (editingAppointmentId !== null) {
      setAppointments(
        appointments.map((apt) =>
          apt.id === editingAppointmentId
            ? {
                ...apt,
                title: editAppointmentForm.title,
                startDate: editAppointmentForm.startDate,
                endDate: editAppointmentForm.endDate,
                location: editAppointmentForm.location,
                memo: editAppointmentForm.memo,
              }
            : apt,
        ),
      )
      setEditingAppointmentId(null)
      setEditAppointmentForm({ title: "", startDate: "", endDate: "", location: "", memo: "" })
    }
  }

  const deleteAppointment = (id: number) => {
    setAppointments(appointments.filter((apt) => apt.id !== id))
    setEditingAppointmentId(null)
    setEditAppointmentForm({ title: "", startDate: "", endDate: "", location: "", memo: "" })
  }

  const handleTimeSlotLongPress = (dayIndex: number, timeSlotIndex: number) => {
    const startDate = selectedStartDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const dayDate = new Date(startDate)
    dayDate.setDate(startDate.getDate() + dayIndex)

    // Calculate the hour based on timeSlotIndex (0 = 終日, 1 = 0:00, 2 = 1:00, etc.)
    const hour = timeSlotIndex - 1 // Subtract 1 because index 0 is 終日

    let startDateTime: Date
    let endDateTime: Date

    if (hour < 0) {
      // 終日 (all-day) - set to 9:00-17:00 as default
      startDateTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 9, 0)
      endDateTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 17, 0)
    } else {
      // Regular hour slot
      startDateTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hour, 0)
      endDateTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hour + 1, 0)
    }

    const startDateStr = `${startDateTime.getFullYear()}-${(startDateTime.getMonth() + 1).toString().padStart(2, "0")}-${startDateTime.getDate().toString().padStart(2, "0")}T${startDateTime.getHours().toString().padStart(2, "0")}:00`
    const endDateStr = `${endDateTime.getFullYear()}-${(endDateTime.getMonth() + 1).toString().padStart(2, "0")}-${endDateTime.getDate().toString().padStart(2, "0")}T${endDateTime.getHours().toString().padStart(2, "0")}:00`

    setAppointmentForm({
      title: "",
      startDate: startDateStr,
      endDate: endDateStr,
      location: "",
      memo: "",
    })
    setIsCreatingAppointment(true)
  }

  const handleTimeSlotMouseDown = (dayIndex: number, timeSlotIndex: number) => {
    longPressTimer.current = setTimeout(() => {
      handleTimeSlotLongPress(dayIndex, timeSlotIndex)
    }, 500) // 500ms long press duration
  }

  const handleTimeSlotMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div className="min-h-screen bg-calendar-bg p-4">
      <div className="flex gap-4 max-w-[1440px] mx-auto h-[calc(100vh-32px)]">
        {/* Left Sidebar */}
        <div className="w-1/4 flex-shrink-0">
          {/* Mini Calendar */}
          <div className="bg-calendar-card rounded-lg p-5 mb-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPreviousMonth} className="p-1 hover:opacity-70 transition-opacity">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <span className="text-foreground font-semibold text-base">
                {currentDate.getFullYear()}/{(currentDate.getMonth() + 1).toString().padStart(2, "0")}
              </span>
              <button onClick={goToNextMonth} className="p-1 hover:opacity-70 transition-opacity">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDaysShort.map((day) => (
                <div key={day} className="text-center text-[13px] text-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              {miniCalendarDays.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => {
                    const isInRange = isDateInRange(day, weekIndex, dayIndex)

                    const year = currentDate.getFullYear()
                    const month = currentDate.getMonth()
                    const firstDay = new Date(year, month, 1)
                    const startDay = firstDay.getDay()

                    let targetMonth = month
                    if (weekIndex === 0 && dayIndex < startDay) {
                      targetMonth = month - 1
                    } else if (weekIndex === generateMiniCalendar().length - 1 && day < 7) {
                      targetMonth = month + 1
                    }

                    const hasAppointment = hasAppointmentOnDate(year, targetMonth, day)
                    const hasTodo = hasTodoOnDate(year, targetMonth, day)

                    return (
                      <button
                        key={dayIndex}
                        onClick={() => handleDateClick(day, weekIndex, dayIndex)}
                        className={`relative text-center text-[13px] py-1.5 rounded transition-colors ${
                          isInRange
                            ? "bg-calendar-primary text-white font-semibold"
                            : "text-foreground hover:bg-calendar-card-hover"
                        } ${selectedView === "月" || selectedView === "ToDo" ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {day}
                        {(hasAppointment || hasTodo) && (
                          <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                            {hasAppointment && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                            {hasTodo && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex mr-0 mb-4 mt-0 ml-0 gap-4 px-1.5">
            <button
              onClick={() => setSelectedView("月")}
              className={`py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap px-4 ${
                selectedView === "月"
                  ? "bg-calendar-primary text-white"
                  : "bg-calendar-card text-foreground hover:bg-calendar-primary hover:text-white"
              }`}
            >
              月
            </button>
            <button
              onClick={() => setSelectedView("5日")}
              className={`px-3 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                selectedView === "5日"
                  ? "bg-calendar-primary text-white"
                  : "bg-calendar-card text-foreground hover:bg-calendar-primary hover:text-white"
              }`}
            >
              5日
            </button>
            <button
              onClick={() => setSelectedView("3日")}
              className={`px-3 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                selectedView === "3日"
                  ? "bg-calendar-primary text-white"
                  : "bg-calendar-card text-foreground hover:bg-calendar-primary hover:text-white"
              }`}
            >
              3日
            </button>
            <button
              onClick={() => setSelectedView("ToDo")}
              className={`px-3 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                selectedView === "ToDo"
                  ? "bg-calendar-primary text-white"
                  : "bg-calendar-card text-foreground hover:bg-calendar-primary hover:text-white"
              }`}
            >
              ToDo
            </button>
          </div>

          {/* Today's Schedule */}
          <div>
            <h2 className="text-foreground font-medium text-base mb-3">今日の予定</h2>
            <div className="border-t border-calendar-card pt-4 min-h-[200px]">
              {todaysAppointments.length > 0 ? (
                <div className="space-y-2">
                  {todaysAppointments.map((apt) => (
                    <div key={apt.id} className="text-foreground text-[14px]">
                      <span className="font-medium">{formatTimeFromDatetime(apt.startDate)}</span>
                      <span className="ml-2">{apt.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-foreground text-[14px] opacity-50">予定なし</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar */}
        <div className="flex-1 min-w-0 flex flex-col -ml-1 my-0 leading-7">
          {/* Add Button */}
          <div className="flex mb-4 flex-shrink-0 mt-0 mr-0 gap-0 justify-end">
            <button
              onClick={() => {
                if (selectedView === "ToDo") {
                  startCreating()
                } else {
                  startCreatingAppointment()
                }
              }}
              className="bg-calendar-primary hover:bg-calendar-primary-hover transition-colors text-white py-3 rounded-md flex px-12 justify-center flex-row items-center mx-0"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {selectedView === "月" ? (
            <>
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-2.5 mb-3 flex-shrink-0">
                {weekDaysFull.map((day) => (
                  <div key={day} className="text-center text-foreground font-medium text-[13px]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="w-full flex-1 flex flex-col gap-2.5 min-h-0">
                {mainCalendarDays.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-2.5 flex-1">
                    {week.map((day, dayIndex) => {
                      const dayNum = Number.parseInt(day.replace(/[^\d]/g, ""))
                      const year = currentDate.getFullYear()
                      const month = currentDate.getMonth()

                      const firstDay = new Date(year, month, 1)
                      const startDay = firstDay.getDay()

                      let targetMonth = month
                      if (weekIndex === 0 && dayIndex < startDay) {
                        // Previous month
                        targetMonth = month - 1
                      } else if (weekIndex === mainCalendarDays.length - 1 && dayNum < 15) {
                        // Next month (days less than 15 in the last week are likely next month)
                        targetMonth = month + 1
                      }

                      const dayAppointments = getAppointmentsForDate(year, targetMonth, dayNum)

                      return (
                        <div
                          key={dayIndex}
                          className="bg-calendar-card rounded-md p-2.5 hover:bg-calendar-card-hover transition-colors cursor-pointer relative"
                        >
                          <div className="text-foreground font-semibold text-[14px] mb-1">{day}</div>
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map((apt) => (
                              <div
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditingAppointment(apt)
                                }}
                                className="bg-calendar-primary text-white text-[11px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                {formatTimeFromDatetime(apt.startDate)} {apt.title}
                              </div>
                            ))}
                            {dayAppointments.length > 3 && (
                              <div className="text-foreground text-[11px] opacity-60">
                                +{dayAppointments.length - 3}件
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : selectedView === "5日" ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 -ml-4">
              <div className="flex gap-1">
                {/* Time Labels Column */}
                <div className="w-[100px] flex-shrink-0">
                  <div className="h-[40px]"></div>
                  {timeSlots.map((time) => (
                    <div key={time} className="h-[80px] flex items-start justify-end pr-2 text-foreground text-[13px]">
                      {time}
                    </div>
                  ))}
                </div>

                {/* 5-Day Grid */}
                <div className="grid grid-cols-5 gap-2 flex-1">
                  {fiveDayDates.map((date, index) => {
                    const startDate =
                      selectedStartDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const dayDate = new Date(startDate)
                    dayDate.setDate(startDate.getDate() + index)
                    const dayAppointments = getAppointmentsForDate(
                      dayDate.getFullYear(),
                      dayDate.getMonth(),
                      dayDate.getDate(),
                    )

                    const { appointmentColumns, columnCount } = getAppointmentLayout(appointments, dayAppointments)

                    return (
                      <div key={index} className="flex flex-col min-w-0">
                        {/* Date Header */}
                        <div className="text-center text-foreground font-semibold text-[15px] h-[40px] flex items-center justify-center sticky top-0 bg-calendar-bg z-10 mb-2">
                          {date.day}({date.weekday})
                        </div>

                        {/* Time Slots Container - Single Rounded Rectangle */}
                        <div className="bg-calendar-card rounded-lg hover:bg-calendar-card-hover transition-colors cursor-pointer relative">
                          {timeSlots.map((time, timeSlotIndex) => (
                            <div
                              key={time}
                              className="h-[80px] border-b border-calendar-divider last:border-b-0"
                              onMouseDown={() => handleTimeSlotMouseDown(index, timeSlotIndex)}
                              onMouseUp={handleTimeSlotMouseUp}
                              onMouseLeave={handleTimeSlotMouseUp}
                              onTouchStart={() => handleTimeSlotMouseDown(index, timeSlotIndex)}
                              onTouchEnd={handleTimeSlotMouseUp}
                            ></div>
                          ))}

                          {dayAppointments.map((apt) => {
                            const { top, height } = getAppointmentPosition(apt.startDate, apt.endDate)
                            const column = appointmentColumns[apt.id]
                            const totalColumns = columnCount[apt.id]
                            const widthPercent = 100 / totalColumns
                            const leftPercent = column * widthPercent

                            // Calculate drag offset if this appointment is being dragged
                            const isDragging = draggingAppointmentId === apt.id
                            const dragOffsetY = isDragging ? dragCurrentY - dragStartY : 0
                            const adjustedTop = top + dragOffsetY

                            return (
                              <div
                                key={apt.id}
                                onMouseDown={(e) => {
                                  // Prevent long press timer when starting drag
                                  if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current)
                                    longPressTimer.current = null
                                  }
                                  handleAppointmentDragStart(e, apt.id, apt.startDate, index)
                                }}
                                onTouchStart={(e) => {
                                  if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current)
                                    longPressTimer.current = null
                                  }
                                  handleAppointmentDragStart(e, apt.id, apt.startDate, index)
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!hasDragged) {
                                    startEditingAppointment(apt)
                                  }
                                }}
                                className={`absolute bg-calendar-primary text-white text-[12px] px-2 py-1 border-2 border-blue-600 rounded-lg overflow-hidden cursor-move hover:opacity-90 transition-opacity ${
                                  isDragging ? "opacity-70 shadow-lg" : ""
                                }`}
                                style={{
                                  top: `${adjustedTop}px`,
                                  height: `${height}px`,
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent - 2}%`,
                                }}
                              >
                                <div className="font-semibold truncate">{apt.title}</div>
                                {height > 40 && apt.location && (
                                  <div className="text-[10px] opacity-90 truncate">{apt.location}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : selectedView === "3日" ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 -ml-4">
              <div className="flex gap-1">
                {/* Time Labels Column */}
                <div className="w-[100px] flex-shrink-0">
                  <div className="h-[40px]"></div>
                  {timeSlots.map((time) => (
                    <div key={time} className="h-[80px] flex items-start justify-end pr-2 text-foreground text-[13px]">
                      {time}
                    </div>
                  ))}
                </div>

                {/* 3-Day Grid */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {threeDayDates.map((date, index) => {
                    const startDate =
                      selectedStartDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const dayDate = new Date(startDate)
                    dayDate.setDate(startDate.getDate() + index)
                    const dayAppointments = getAppointmentsForDate(
                      dayDate.getFullYear(),
                      dayDate.getMonth(),
                      dayDate.getDate(),
                    )

                    const { appointmentColumns, columnCount } = getAppointmentLayout(appointments, dayAppointments)

                    return (
                      <div key={index} className="flex flex-col min-w-0">
                        {/* Date Header */}
                        <div className="text-center text-foreground font-semibold text-[15px] h-[40px] flex items-center justify-center sticky top-0 bg-calendar-bg z-10 mb-2">
                          {date.day}({date.weekday})
                        </div>

                        {/* Time Slots Container */}
                        <div className="bg-calendar-card rounded-lg hover:bg-calendar-card-hover transition-colors cursor-pointer relative">
                          {timeSlots.map((time, timeSlotIndex) => (
                            <div
                              key={time}
                              className="h-[80px] border-b border-calendar-divider last:border-b-0"
                              onMouseDown={() => handleTimeSlotMouseDown(index, timeSlotIndex)}
                              onMouseUp={handleTimeSlotMouseUp}
                              onMouseLeave={handleTimeSlotMouseUp}
                              onTouchStart={() => handleTimeSlotMouseDown(index, timeSlotIndex)}
                              onTouchEnd={handleTimeSlotMouseUp}
                            ></div>
                          ))}

                          {dayAppointments.map((apt) => {
                            const { top, height } = getAppointmentPosition(apt.startDate, apt.endDate)
                            const column = appointmentColumns[apt.id]
                            const totalColumns = columnCount[apt.id]
                            const widthPercent = 100 / totalColumns
                            const leftPercent = column * widthPercent

                            // Calculate drag offset if this appointment is being dragged
                            const isDragging = draggingAppointmentId === apt.id
                            const dragOffsetY = isDragging ? dragCurrentY - dragStartY : 0
                            const adjustedTop = top + dragOffsetY

                            return (
                              <div
                                key={apt.id}
                                onMouseDown={(e) => {
                                  if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current)
                                    longPressTimer.current = null
                                  }
                                  handleAppointmentDragStart(e, apt.id, apt.startDate, index)
                                }}
                                onTouchStart={(e) => {
                                  if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current)
                                    longPressTimer.current = null
                                  }
                                  handleAppointmentDragStart(e, apt.id, apt.startDate, index)
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!hasDragged) {
                                    startEditingAppointment(apt)
                                  }
                                }}
                                className={`absolute bg-calendar-primary text-white text-[12px] px-2 py-1 border-2 border-blue-600 rounded-lg overflow-hidden cursor-move hover:opacity-90 transition-opacity ${
                                  isDragging ? "opacity-70 shadow-lg" : ""
                                }`}
                                style={{
                                  top: `${adjustedTop}px`,
                                  height: `${height}px`,
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent - 2}%`,
                                }}
                              >
                                <div className="font-semibold truncate">{apt.title}</div>
                                {height > 40 && apt.location && (
                                  <div className="text-[10px] opacity-90 truncate">{apt.location}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full bg-white rounded-lg p-5 overflow-y-auto px-5 h-auto border-0 leading-7 py-5 my-0">
              <div className="mb-8">
                {/* Table Header with Sortable Columns */}
                <div className="flex items-center gap-3 pb-4 border-b border leading-7 border-card mb-0">
                  <div className="w-[36px]"></div>
                  <button
                    onClick={() => handleSort("title")}
                    className="flex-1 flex items-center gap-2 text-foreground font-semibold text-[15px] hover:opacity-70 transition-opacity"
                  >
                    タイトル
                    {sortColumn === "title" ? (
                      sortDirection === "asc" ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <ChevronDown className="w-4 h-4 opacity-30" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("deadline")}
                    className="w-[160px] flex items-center gap-2 text-foreground font-semibold text-[15px] hover:opacity-70 transition-opacity"
                  >
                    期限
                    {sortColumn === "deadline" ? (
                      sortDirection === "asc" ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <ChevronDown className="w-4 h-4 opacity-30" />
                    )}
                  </button>
                  <div className="w-[90px]"></div>
                </div>

                {/* Active Todo Items */}
                <div className="space-y-4">
                  {activeTodos.map((todo) => {
                    const urgency = getDeadlineUrgency(todo.deadline)
                    const urgencyStyles =
                      urgency === "overdue"
                        ? "bg-gray-600 text-white rounded-md px-2 py-1 font-semibold"
                        : urgency === "urgent"
                          ? "bg-red-600 text-white rounded-md px-2 py-1 font-semibold"
                          : urgency === "warning"
                            ? "bg-orange-100 rounded-md px-2 py-1"
                            : ""

                    return (
                      <div key={todo.id} className="flex items-center gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className="w-[28px] h-[28px] border-2 border-foreground rounded-[4px] flex items-center justify-center hover:bg-calendar-bg transition-colors flex-shrink-0"
                        >
                          {todo.checked && (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.6667 5L7.50004 14.1667L3.33337 10"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="text-foreground text-[15px] font-medium break-words">{todo.title}</div>
                          {todo.memo && (
                            <div className="text-foreground text-[13px] opacity-60 mt-1 whitespace-pre-wrap break-words">
                              {todo.memo}
                            </div>
                          )}
                        </div>

                        <div className="w-[160px] flex items-center justify-center text-foreground text-[15px]">
                          <span className={`${urgencyStyles} inline-block w-[130px] text-center`}>
                            {urgency === "overdue" ? "OVER" : todo.deadline}
                          </span>
                        </div>

                        {/* Details Button */}
                        <div className="w-[90px]">
                          <button
                            onClick={() => startEditing(todo)}
                            className="bg-calendar-action hover:bg-calendar-action-hover transition-colors text-white py-2 rounded text-[14px] font-medium w-full px-[16] leading-5"
                          >
                            詳細
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {completedTodos.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold text-[16px] pb-3 border-b border border-card leading-7 mb-0 mt-8">
                      完了したタスク
                    </h3>

                    {/* Completed Todo Items */}
                    <div className="space-y-4">
                      {completedTodos.map((todo) => (
                        <div key={todo.id} className="flex items-center gap-3 opacity-60">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTodo(todo.id)}
                            className="w-[28px] h-[28px] border-2 border-foreground rounded-[4px] flex items-center justify-center hover:bg-calendar-bg transition-colors flex-shrink-0"
                          >
                            {todo.checked && (
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.6667 5L7.50004 14.1667L3.33337 10"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0 text-foreground text-[15px] font-medium line-through break-words">
                            {todo.title}
                          </div>

                          <div className="w-[160px] flex items-center justify-center text-foreground text-[15px]">
                            <span className="inline-block w-[130px] text-center">{todo.deadline}</span>
                          </div>

                          <div className="w-[90px]">
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="bg-red-600 hover:bg-red-700 transition-colors text-white px-4 py-2 rounded text-[14px] font-medium w-full leading-5"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingId !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={cancelEditing}
        >
          <div
            className="bg-white rounded-lg p-6 w-[500px] max-w-[90vw] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-foreground text-[18px] font-semibold">タスクを編集</h2>
              <button onClick={cancelEditing} className="text-foreground hover:opacity-70 transition-opacity">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">タイトル</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">期限</label>
                <input
                  type="datetime-local"
                  value={displayToDatetimeLocal(editForm.deadline)}
                  onChange={(e) => setEditForm({ ...editForm, deadline: datetimeLocalToDisplay(e.target.value) })}
                  className="w-full text-foreground text-[16px] border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-calendar-primary cursor-pointer hover:border-calendar-primary transition-colors"
                  style={{ minHeight: "48px" }}
                />
                <p className="text-gray-500 text-[12px] mt-1">タップしてスクロールで日時を選択</p>
              </div>

              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">メモ</label>
                <textarea
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  placeholder="メモを入力..."
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent resize-none"
                  rows={8}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEditing}
                className="flex-1 bg-gray-500 hover:bg-gray-600 transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={saveEditing}
                className="flex-1 bg-green-600 hover:bg-green-700 transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={cancelCreating}
        >
          <div
            className="bg-white rounded-lg p-6 w-[500px] max-w-[90vw] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-foreground text-[18px] font-semibold">新規タスク</h2>
              <button onClick={cancelCreating} className="text-foreground hover:opacity-70 transition-opacity">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Create Form */}
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">タイトル</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="タスク名を入力..."
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">期限</label>
                <input
                  type="datetime-local"
                  value={displayToDatetimeLocal(createForm.deadline)}
                  onChange={(e) => setCreateForm({ ...createForm, deadline: datetimeLocalToDisplay(e.target.value) })}
                  className="w-full text-foreground text-[16px] border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-calendar-primary cursor-pointer hover:border-calendar-primary transition-colors"
                  style={{ minHeight: "48px" }}
                />
                <p className="text-gray-500 text-[12px] mt-1">タップしてスクロールで日時を選択</p>
              </div>

              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">メモ</label>
                <textarea
                  value={createForm.memo}
                  onChange={(e) => setCreateForm({ ...createForm, memo: e.target.value })}
                  placeholder="メモを入力..."
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent resize-none"
                  rows={8}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelCreating}
                className="flex-1 bg-gray-500 hover:bg-gray-600 transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={saveNewTask}
                className="flex-1 bg-calendar-action hover:bg-calendar-action-hover transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatingAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={cancelCreatingAppointment}
        >
          <div
            className="bg-white rounded-lg p-6 w-[500px] max-w-[90vw] shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-foreground text-[18px] font-semibold">新規予定</h2>
              <button
                onClick={cancelCreatingAppointment}
                className="text-foreground hover:opacity-70 transition-opacity"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Create Form */}
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">タイトル</label>
                <input
                  type="text"
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                  placeholder="予定名を入力..."
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent"
                />
              </div>

              {/* Start Date/Time */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">開始日時</label>
                <input
                  type="datetime-local"
                  value={appointmentForm.startDate}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, startDate: e.target.value })}
                  className="w-full text-foreground text-[16px] border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-calendar-primary cursor-pointer hover:border-calendar-primary transition-colors"
                  style={{ minHeight: "48px" }}
                />
                <p className="text-gray-500 text-[12px] mt-1">タップしてスクロールで日時を選択</p>
              </div>

              {/* End Date/Time */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">終了日時</label>
                <input
                  type="datetime-local"
                  value={appointmentForm.endDate}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, endDate: e.target.value })}
                  className="w-full text-foreground text-[16px] border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-calendar-primary cursor-pointer hover:border-calendar-primary transition-colors"
                  style={{ minHeight: "48px" }}
                />
                <p className="text-gray-500 text-[12px] mt-1">タップしてスクロールで日時を選択</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">場所</label>
                <input
                  type="text"
                  value={appointmentForm.location}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })}
                  placeholder="場所を入力..."
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">メモ</label>
                <textarea
                  value={appointmentForm.memo}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, memo: e.target.value })}
                  placeholder="メモを入力..."
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent resize-none"
                  rows={6}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelCreatingAppointment}
                className="flex-1 bg-gray-500 hover:bg-gray-600 transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={saveNewAppointment}
                className="flex-1 bg-calendar-action hover:bg-calendar-action-hover transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAppointmentId !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={cancelEditingAppointment}
        >
          <div
            className="bg-white rounded-lg p-6 w-[500px] max-w-[90vw] shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-foreground text-[18px] font-semibold">予定の詳細</h2>
              <button
                onClick={cancelEditingAppointment}
                className="text-foreground hover:opacity-70 transition-opacity"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">タイトル</label>
                <input
                  type="text"
                  value={editAppointmentForm.title}
                  onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, title: e.target.value })}
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent"
                />
              </div>

              {/* Start Date/Time */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">開始日時</label>
                <input
                  type="datetime-local"
                  value={editAppointmentForm.startDate}
                  onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, startDate: e.target.value })}
                  className="w-full text-foreground text-[16px] border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-calendar-primary cursor-pointer hover:border-calendar-primary transition-colors"
                  style={{ minHeight: "48px" }}
                />
                <p className="text-gray-500 text-[12px] mt-1">タップしてスクロールで日時を選択</p>
              </div>

              {/* End Date/Time */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">終了日時</label>
                <input
                  type="datetime-local"
                  value={editAppointmentForm.endDate}
                  onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, endDate: e.target.value })}
                  className="w-full text-foreground text-[16px] border-2 border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-calendar-primary cursor-pointer hover:border-calendar-primary transition-colors"
                  style={{ minHeight: "48px" }}
                />
                <p className="text-gray-500 text-[12px] mt-1">タップしてスクロールで日時を選択</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">場所</label>
                <input
                  type="text"
                  value={editAppointmentForm.location}
                  onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, location: e.target.value })}
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-foreground text-[14px] font-medium mb-2">メモ</label>
                <textarea
                  value={editAppointmentForm.memo}
                  onChange={(e) => setEditAppointmentForm({ ...editAppointmentForm, memo: e.target.value })}
                  className="w-full text-foreground text-[15px] border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calendar-primary focus:border-transparent resize-none whitespace-pre-wrap break-words"
                  rows={6}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteAppointment(editingAppointmentId)}
                className="flex-1 bg-red-600 hover:bg-red-700 transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                削除
              </button>
              <button
                onClick={saveEditingAppointment}
                className="flex-1 bg-green-600 hover:bg-green-700 transition-colors text-white px-4 py-2.5 rounded-md text-[15px] font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
