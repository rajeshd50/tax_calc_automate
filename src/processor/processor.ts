import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { EVENTS } from '../constants/events';
import { v4 as uuidv4 } from 'uuid';
import { ProcessCurrentState, ProcessStats } from '../constants/interfaces';
import { format } from 'date-fns'
import fs from 'fs';
const sqlite3 = require('sqlite3')
const userDataFolder = app.getPath('userData')

const dbFilePath = path.join(userDataFolder, 'tax_calculator_excel', 'db_v1.db')

export default class TaxProcessor {
    
    private mainWindow: BrowserWindow | null = null
    private db = null
    private processingId: string | null = null
    private opFileName: string | null = null
    private currentProcessStat: ProcessStats = {
        totalFile: 0,
        currentFile: 0,
        currentState: ProcessCurrentState.STARTING
    }
    private allInputFiles: string[] = []

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow
        this.db = new sqlite3.Database(dbFilePath);
    }

    private log(message: string) {
        this.mainWindow?.webContents.send(EVENTS.ADD_LOG, message)
    }
    private clearLogs() {
        this.mainWindow?.webContents.send(EVENTS.CLEAR_LOGS)
    }
    private sendUpdatedStats() {
        this.mainWindow?.webContents.send(EVENTS.UPDATE_STATS, this.currentProcessStat)
    }
    private sendEvent(eventName: string, data?: any) {
        this.mainWindow?.webContents.send(eventName, data)
    }

    startProcessing(inputFolder: string, outputFolder: string) {
        this.log('Processing starts')
        this.log(`Source Directory -- ${inputFolder}`)
        this.log(`Destination Directory -- ${outputFolder}`)

        this.processingId = uuidv4()
        this.opFileName = `${format(new Date(), 'dd_MM_yyyy__hh_mm_ss_bbb')}.xlsx`

        this.log(`Process id -- ${this.processingId}`)
        this.log(`Output File -- ${this.opFileName}`)

        this.readInitialStat(inputFolder)
        this.startExcelProcessing(outputFolder)
    }

    private readInitialStat(inputFolder: string) {
        this.log('Reading directory')
        let files = fs.readdirSync(inputFolder)
        files = files.filter(x => x.endsWith('.xlsx'))

        if (!files.length) {
            this.log('No *.xlsx files in directory')
            this.sendEvent(EVENTS.ERROR.NO_FILES_IN_INP_DIR)
            this.resetAll()
            return
        }

        this.log(`Total ${files.length} files found`)
        this.currentProcessStat.totalFile = files.length
        this.currentProcessStat.currentFile = 1
        this.currentProcessStat.currentState = ProcessCurrentState.READING_DIR

        this.sendUpdatedStats()

        this.allInputFiles = files
    }

    stopProcessing() {
        this.log('Processing stops')
        this.resetAll()
    }

    private resetAll() {
        this.currentProcessStat = {
            totalFile: 0,
            currentFile: 0,
            currentState: ProcessCurrentState.STARTING
        }
        this.processingId = null
        this.opFileName = null
        this.allInputFiles = []

        this.sendUpdatedStats()
    }

    private startExcelProcessing(outputFolder: string) {

    }
}