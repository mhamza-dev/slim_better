import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import ExcelJS from 'exceljs'

// Utility function to convert image to base64
const imageToBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Remove data:image/jpeg;base64, prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting image to base64:', error)
    return ''
  }
}

export interface ExcelExportOptions {
  filename: string
  sheetName?: string
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExcelExportOptions
) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

    // Create blob and save
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `${options.filename}.xlsx`)

    // Show success message
    setTimeout(() => {
      alert('Excel file exported successfully!')
    }, 100)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    alert('Failed to export data. Please try again.')
  }
}

// Enhanced export function with logo support using ExcelJS
export async function exportToExcelWithLogo<T extends Record<string, unknown>>(
  data: T[],
  options: ExcelExportOptions & {
    logoPath?: string
    logoPosition?: { row: number; col: number }
    logoSize?: { width: number; height: number }
  }
) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet1')

    // Add logo if provided
    if (options.logoPath) {
      try {
        const base64Logo = await imageToBase64(options.logoPath)
        if (base64Logo) {
          const imageId = workbook.addImage({
            base64: base64Logo,
            extension: 'jpeg',
          })

          const logoPosition = options.logoPosition || { row: 0, col: 0 }
          const logoSize = options.logoSize || { width: 100, height: 50 }

          worksheet.addImage(imageId, {
            tl: { col: logoPosition.col, row: logoPosition.row },
            ext: { width: logoSize.width, height: logoSize.height },
          })

          // Adjust data start row to accommodate logo
          const dataStartRow = logoPosition.row + Math.ceil(logoSize.height / 20) + 1

          // Add headers
          const headers = Object.keys(data[0])
          headers.forEach((header, index) => {
            const cell = worksheet.getCell(dataStartRow, index + 1)
            cell.value = header
            cell.font = { bold: true }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6EEF8' }
            }
          })

          // Add data rows
          data.forEach((row, rowIndex) => {
            headers.forEach((header, colIndex) => {
              const cell = worksheet.getCell(dataStartRow + rowIndex + 1, colIndex + 1)
              cell.value = (row[header] as string | number) || ''
            })
          })

          // Auto-fit columns
          worksheet.columns.forEach(column => {
            column.width = 15
          })
        }
      } catch (logoError) {
        console.warn('Could not add logo to Excel file:', logoError)
        // Fallback to regular export without logo
        exportToExcel(data, options)
        return
      }
    } else {
      // Regular export without logo
      exportToExcel(data, options)
      return
    }

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, `${options.filename}.xlsx`)

    // Show success message
    setTimeout(() => {
      alert('Excel file exported successfully!')
    }, 100)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    alert('Failed to export data. Please try again.')
  }
}

export function exportPatientsToExcel(patients: Array<{
  name: string
  phone_number: string
  age?: number | null
  address?: string | null
  date_of_birth?: string | null
  created_at?: string | null
}>) {
  const formattedData = patients.map(patient => ({
    'Name': patient.name || '',
    'Phone Number': patient.phone_number || '',
    'Age': patient.age || '',
    'Address': patient.address || '',
    'Date of Birth': patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '',
    'Created Date': patient.created_at ? new Date(patient.created_at).toLocaleDateString() : ''
  }))

  exportToExcel(formattedData, {
    filename: `patients_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Patients'
  })
}

export function exportPackagesToExcel(packages: Array<{
  created_by: string | null
  no_of_sessions: number
  sessions_completed: number
  gap_between_sessions: number
  start_date: string
  next_session_date?: string | null
  total_payment: number
  paid_payment: number
  advance_payment: number
  creator?: { id: string; email: string | null } | null
  user?: { id: string }
}>, patientName?: string) {
  const formattedData = packages.map(pkg => ({
    'Patient Name': patientName || '',
    'Created By': pkg.created_by === pkg.user?.id ? 'You' : (pkg.creator?.email || ''),
    'Total Sessions': pkg.no_of_sessions || 0,
    'Completed Sessions': pkg.sessions_completed || 0,
    'Gap (Days)': pkg.gap_between_sessions || 0,
    'Start Date': pkg.start_date ? new Date(pkg.start_date).toLocaleDateString() : '',
    'Next Session Date': pkg.next_session_date ? new Date(pkg.next_session_date).toLocaleDateString() : '',
    'Total Payment (PKR)': pkg.total_payment || 0,
    'Paid Payment (PKR)': pkg.paid_payment || 0,
    'Advance Payment (PKR)': pkg.advance_payment || 0,
    'Pending Payment (PKR)': (pkg.total_payment - (pkg.paid_payment + pkg.advance_payment)) || 0
  }))

  const filename = patientName
    ? `packages_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
    : `packages_${new Date().toISOString().split('T')[0]}`

  exportToExcel(formattedData, {
    filename,
    sheetName: 'Packages'
  })
}

export function exportDashboardToExcel(dashboardData: {
  totalPatients: number
  totalPackages: number
  totalRevenue: number
  totalPaid: number
  totalAdvance: number
  upcomingSessions: Array<{
    patients?: { name?: string } | null
    next_session_date?: string | null
    daysUntil?: number
  }>
}) {
  const summaryData = [{
    'Metric': 'Total Patients',
    'Value': dashboardData.totalPatients
  }, {
    'Metric': 'Total Packages',
    'Value': dashboardData.totalPackages
  }, {
    'Metric': 'Total Revenue (PKR)',
    'Value': dashboardData.totalRevenue
  }, {
    'Metric': 'Total Paid (PKR)',
    'Value': dashboardData.totalPaid
  }, {
    'Metric': 'Total Advance (PKR)',
    'Value': dashboardData.totalAdvance
  }]

  const upcomingSessionsData = dashboardData.upcomingSessions.map(session => ({
    'Patient Name': session.patients?.name || '',
    'Next Session Date': session.next_session_date ? new Date(session.next_session_date).toLocaleDateString() : '',
    'Days Until': session.daysUntil || ''
  }))

  try {
    const workbook = XLSX.utils.book_new()

    // Add summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Add upcoming sessions sheet
    if (upcomingSessionsData.length > 0) {
      const sessionsSheet = XLSX.utils.json_to_sheet(upcomingSessionsData)
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Upcoming Sessions')
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `dashboard_${new Date().toISOString().split('T')[0]}.xlsx`)

    // Show success message
    setTimeout(() => {
      alert('Dashboard data exported successfully!')
    }, 100)
  } catch (error) {
    console.error('Error exporting dashboard to Excel:', error)
    alert('Failed to export dashboard data. Please try again.')
  }
}

// Enhanced export functions with logo support
export async function exportPatientsToExcelWithLogo(patients: Array<{
  name: string
  phone_number: string
  age?: number | null
  address?: string | null
  branch_name?: string | null
  date_of_birth?: string | null
  created_at?: string | null
}>) {
  const formattedData = patients.map(patient => ({
    'Name': patient.name || '',
    'Phone Number': patient.phone_number || '',
    'Age': patient.age || '',
    'Address': patient.address || '',
    'Branch Name': patient.branch_name || '',
    'Date of Birth': patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '',
    'Created Date': patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '',
  }))

  await exportToExcelWithLogo(formattedData, {
    filename: `patients_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Patients',
    logoPath: '/logo.PNG',
    logoPosition: { row: 0, col: 0 },
    logoSize: { width: 120, height: 60 }
  })
}

export async function exportPackagesToExcelWithLogo(packages: Array<{
  created_by: string | null
  no_of_sessions: number
  sessions_completed: number
  gap_between_sessions: number
  start_date: string
  next_session_date?: string | null
  total_payment: number
  paid_payment: number
  advance_payment: number
  creator?: { id: string; email: string | null } | null
  user?: { id: string }
}>, patientName?: string) {
  const formattedData = packages.map(pkg => ({
    'Patient Name': patientName || '',
    'Created By': pkg.created_by === pkg.user?.id ? 'You' : (pkg.creator?.email || ''),
    'Total Sessions': pkg.no_of_sessions || 0,
    'Completed Sessions': pkg.sessions_completed || 0,
    'Gap (Days)': pkg.gap_between_sessions || 0,
    'Start Date': pkg.start_date ? new Date(pkg.start_date).toLocaleDateString() : '',
    'Next Session Date': pkg.next_session_date ? new Date(pkg.next_session_date).toLocaleDateString() : '',
    'Total Payment (PKR)': pkg.total_payment || 0,
    'Paid Payment (PKR)': pkg.paid_payment || 0,
    'Advance Payment (PKR)': pkg.advance_payment || 0,
    'Pending Payment (PKR)': (pkg.total_payment || 0) - (pkg.paid_payment === 0 ? pkg.advance_payment : pkg.paid_payment),
  }))

  const filename = patientName
    ? `packages_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
    : `packages_${new Date().toISOString().split('T')[0]}`

  await exportToExcelWithLogo(formattedData, {
    filename,
    sheetName: 'Packages',
    logoPath: '/logo.PNG',
    logoPosition: { row: 0, col: 0 },
    logoSize: { width: 120, height: 60 }
  })
}

export async function exportDashboardToExcelWithLogo(dashboardData: {
  totalPatients: number
  totalPackages: number
  totalRevenue: number
  totalPaid: number
  totalAdvance: number
  upcomingSessions: Array<{
    patients?: { name?: string } | null
    next_session_date?: string | null
    daysUntil?: number
  }>
}) {
  try {
    const { totalPatients, totalPackages, totalRevenue, totalPaid, totalAdvance, upcomingSessions } = dashboardData

    const workbook = new ExcelJS.Workbook()

    // Add logo to workbook
    try {
      const base64Logo = await imageToBase64('/logo.PNG')
      if (base64Logo) {
        const imageId = workbook.addImage({
          base64: base64Logo,
          extension: 'jpeg',
        })

        // Summary Sheet
        const summarySheet = workbook.addWorksheet('Summary')
        summarySheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 60 },
        })

        const dataStartRow = 4
        const summaryData = [
          ['Metric', 'Value'],
          ['Total Patients', totalPatients],
          ['Total Packages', totalPackages],
          ['Total Revenue', totalRevenue],
          ['Total Paid', totalPaid],
          ['Total Advance', totalAdvance],
        ]

        summaryData.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const cellRef = summarySheet.getCell(dataStartRow + rowIndex, colIndex + 1)
            cellRef.value = cell
            if (rowIndex === 0) {
              cellRef.font = { bold: true }
              cellRef.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6EEF8' }
              }
            }
          })
        })

        // Upcoming Sessions Sheet
        if (upcomingSessions.length > 0) {
          const sessionsSheet = workbook.addWorksheet('Upcoming Sessions')
          sessionsSheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 120, height: 60 },
          })

          const sessionsDataStartRow = 4
          const upcomingSessionsData = upcomingSessions.map(session => ({
            'Patient Name': session.patients?.name || 'N/A',
            'Next Session Date': session.next_session_date ? new Date(session.next_session_date).toLocaleDateString() : 'N/A',
            'Days Until': session.daysUntil,
          }))

          // Add headers
          const headers = Object.keys(upcomingSessionsData[0])
          headers.forEach((header, index) => {
            const cell = sessionsSheet.getCell(sessionsDataStartRow, index + 1)
            cell.value = header
            cell.font = { bold: true }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE6EEF8' }
            }
          })

          // Add data
          upcomingSessionsData.forEach((row, rowIndex) => {
            headers.forEach((header, colIndex) => {
              const cell = sessionsSheet.getCell(sessionsDataStartRow + rowIndex + 1, colIndex + 1)
              cell.value = (row[header as keyof typeof row] as string | number) || ''
            })
          })
        }

        // Auto-fit columns
        workbook.worksheets.forEach(worksheet => {
          worksheet.columns.forEach(column => {
            column.width = 15
          })
        })
      }
    } catch (logoError) {
      console.warn('Could not add logo to dashboard Excel file:', logoError)
      // Fallback to regular export
      exportDashboardToExcel(dashboardData)
      return
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, `dashboard_${new Date().toISOString().split('T')[0]}.xlsx`)

    setTimeout(() => {
      alert('Dashboard data exported successfully!')
    }, 100)
  } catch (error) {
    console.error('Error exporting dashboard to Excel:', error)
    alert('Failed to export dashboard data. Please try again.')
  }
}
