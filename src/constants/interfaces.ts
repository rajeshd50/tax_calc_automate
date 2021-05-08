export enum CurrentState {
	INPUT = 0,
	OUTPUT = 1,
	PROCESSING = 2,
	DONE = 3
}

export enum ProcessCurrentState {
    STARTING = -1,
    READING_DIR = 0,
    READING_FILES = 1,
    PARSING_FILES = 2,
    PROCESSING_DATA = 3,
    WRITING_OP = 4,
    FINISHED = 5,
    ERROR = 6
}

export interface Logs {
	data: string;
	date: string;
}

export interface ProcessStats {
    totalFile: number;
    currentFile: number;
    currentState: ProcessCurrentState;
}