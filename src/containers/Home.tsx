import React, { useEffect, useState } from 'react';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
const { ipcRenderer } = require('electron');
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import LinearProgress from '@material-ui/core/LinearProgress';
import Divider from '@material-ui/core/Divider';
import { format } from 'date-fns';
import { EVENTS } from '../constants/events';
import { CurrentState, Logs, ProcessCurrentState, ProcessStats } from '../constants/interfaces';

const useStyles = makeStyles((theme) => ({
	root: {
		flexGrow: 1
	},
	headerPaper: {
		padding: theme.spacing(2),
		textAlign: 'center',
		color: theme.palette.text.secondary,
		marginTop: theme.spacing(3)
	},
	folderChooserPaper: {
		padding: theme.spacing(2),
		color: theme.palette.text.secondary
	},
	folderChooserInnerGrid: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexDirection: 'row'
	},
	folderOutputPaper: {
		padding: theme.spacing(2),
		color: theme.palette.text.secondary
	},
	outputActionGrid: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center'
	},
	outputActionGridChangeOp: {
		display: 'flex',
		justifyContent: 'start',
		alignItems: 'center'
	},
	outputActionGridStartOp: {
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center'
	},
	actionButton: {
		minWidth: '140px'
	},
	outputActionGridProcessAction: {
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center'
	},
	logWindow: {
		display: 'flex',
		flex: 1,
		background: '#263238',
		flexDirection: 'column',
		height: '140px',
		padding: theme.spacing(1),
		overflowY: 'scroll'
	},
	logWindowTextLine: {
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'center',
		flexDirection: 'row'
	},
	logWindowText: {
		color: '#64DD17'
	},
	logWindowTextDate: {
		color: '#64DD17'
	}
}));

function Home() {
	const classes = useStyles();

	const [ snackOpen, setSnackOpen ] = useState(false);
	const [ snackMessage, setSnackMessage ] = useState('');

	const [ currentState, setCurrentState ] = useState<CurrentState>(CurrentState.INPUT);

	const [ outputDirectory, setOutputDirectory ] = useState('');
	const [ inputDirectory, setInputDirectory ] = useState('');
	const [ logs, setLogs ] = useState<Logs[]>([]);

	const [ currentProcessStat, setCurrentProcessStat ] = useState<ProcessStats>({
		totalFile: 0,
		currentFile: 0,
		currentState: ProcessCurrentState.STARTING
	});

	useEffect(() => {
		if (logs && logs.length) {
			let logPanel = document.getElementById('log_panel')
			if (logPanel) {
				logPanel.scrollTop = logPanel.scrollHeight
			}
		}
	}, [logs])

	useEffect(() => {
		ipcRenderer.on(EVENTS.OPEN_SOURCE_CHOOSER_RESULT, async (event: any, data: any) => {
			if (data && !data.canceled && data.filePaths && data.filePaths.length) {
				setSnackMessage(`Source selected`);
				setSnackOpen(true);
				setCurrentState(CurrentState.OUTPUT);
				setOutputDirectory(data.filePaths[0]);
				setInputDirectory(data.filePaths[0]);
			} else {
				setSnackMessage(`No source folder selected!`);
				setSnackOpen(true);
			}
		});
		ipcRenderer.on(EVENTS.OPEN_DESTINATION_CHOOSER_RESULT, async (event: any, data: any) => {
			if (data && !data.canceled && data.filePaths && data.filePaths.length) {
				setCurrentState(CurrentState.OUTPUT);
				setOutputDirectory(data.filePaths[0]);
			}
		});

		ipcRenderer.on(EVENTS.ADD_LOG, async (event: any, data: any) => {
			console.log('Adding log ---- ', data);
			if (data) {
				let logObj: Logs = {
					data,
					date: format(new Date(), 'Pp')
				};
				let oldLogs = logs;
				if (oldLogs.length > 1000) {
					oldLogs.splice(0, 1);
					oldLogs.push(logObj);
				} else {
					oldLogs.push(logObj);
				}
				setLogs([ ...oldLogs ]);
			}
		});
		ipcRenderer.on(EVENTS.CLEAR_LOGS, async (event: any, data: any) => {
			setLogs([]);
		});
		ipcRenderer.on(EVENTS.UPDATE_STATS, async (event: any, data: any) => {
			setCurrentProcessStat(data);
		});
	}, []);

	const openFileChooser = () => {
		ipcRenderer.send(EVENTS.OPEN_SOURCE_CHOOSER);
	};

	const openOutputFileChooser = () => {
		ipcRenderer.send(EVENTS.OPEN_DESTINATION_CHOOSER);
	};

	const startProcessing = () => {
		ipcRenderer.send(EVENTS.START_PROCESSING, {
			input: inputDirectory,
			output: outputDirectory
		});
		setCurrentState(CurrentState.PROCESSING);
	};
	const stopProcessing = () => {
		ipcRenderer.send(EVENTS.CANCEL_PROCESSING);
		setCurrentState(CurrentState.INPUT);
	};

	const handleSnackClose = (event: any, reason?: any) => {
		if (reason === 'clickaway') {
			return;
		}
		setSnackOpen(false);
	};

	return (
		<Container maxWidth="lg">
			<div className={classes.root}>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Paper className={classes.headerPaper}>
							<Typography variant="h5" component="h1">
								Automated tax calculator
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={12}>
						<Paper className={classes.folderChooserPaper}>
							<Grid container spacing={1}>
								<Grid item xs={12}>
									<Typography variant="subtitle1">Source Directory</Typography>
								</Grid>
								<Grid item xs={12} className={classes.folderChooserInnerGrid}>
									<Typography variant="h6" align="left">
										{currentState >= CurrentState.OUTPUT ? inputDirectory : 'Choose Source Folder'}
									</Typography>
								</Grid>
								<Grid item xs={12}>
									<Button
										disabled={currentState > CurrentState.OUTPUT}
										onClick={openFileChooser}
										variant="outlined"
										color="primary"
										className={classes.actionButton}
									>
										Select
									</Button>
								</Grid>
							</Grid>
						</Paper>
					</Grid>
					{currentState >= CurrentState.OUTPUT ? (
						<Grid item xs={12}>
							<Paper className={classes.folderOutputPaper}>
								<Grid container spacing={1}>
									<Grid item xs={12}>
										<Typography variant="subtitle1">Destination Directory</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="h6">{outputDirectory}</Typography>
									</Grid>
									<Grid item xs={6} className={classes.outputActionGridChangeOp}>
										<Button
											disabled={currentState > CurrentState.OUTPUT}
											onClick={openOutputFileChooser}
											variant="outlined"
											color="primary"
											className={classes.actionButton}
										>
											Change
										</Button>
									</Grid>
									<Grid item xs={6} className={classes.outputActionGridStartOp}>
										<Button
											disabled={currentState > CurrentState.OUTPUT}
											onClick={startProcessing}
											variant="contained"
											color="primary"
											className={classes.actionButton}
										>
											Start
										</Button>
									</Grid>
								</Grid>
							</Paper>
						</Grid>
					) : null}
					{currentState >= CurrentState.PROCESSING ? (
						<Grid item xs={12}>
							<Paper className={classes.folderOutputPaper}>
								<Grid container spacing={1}>
									<Grid item xs={12}>
										<Typography variant="subtitle1">Task Status</Typography>
									</Grid>
									<Grid item xs={8}>
										<Grid container spacing={1}>
											<Grid item xs={12}>
												<LinearProgress />
											</Grid>
											<Grid item xs={12}>
												<Typography variant="subtitle1">
													{currentProcessStat.currentFile}/{currentProcessStat.totalFile}
												</Typography>
											</Grid>
										</Grid>
									</Grid>
									<Grid item xs={4} className={classes.outputActionGridProcessAction}>
										<Button
											variant="contained"
											color="secondary"
											className={classes.actionButton}
											onClick={stopProcessing}
										>
											{currentProcessStat.currentState === ProcessCurrentState.FINISHED ? (
												'Close'
											) : (
												'Cancel'
											)}
										</Button>
									</Grid>
									<Grid item xs={12}>
										<Divider />
										<Typography variant="subtitle1">Logs</Typography>
										<Paper elevation={0} className={classes.logWindow} id="log_panel">
											{logs && logs.length ? (
												logs.map((log, index) => {
													return (
														<div key={index} className={classes.logWindowTextLine}>
															<Typography
																className={classes.logWindowTextDate}
																variant="subtitle2"
															>
																[{log.date}]&nbsp;
															</Typography>
															<Typography
																className={classes.logWindowText}
																variant="subtitle2"
															>
																{log.data}
															</Typography>
														</div>
													);
												})
											) : (
												<Typography className={classes.logWindowText} variant="subtitle2">
													No Logs Available!
												</Typography>
											)}
										</Paper>
									</Grid>
								</Grid>
							</Paper>
						</Grid>
					) : null}
				</Grid>
			</div>

			<Snackbar
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'center'
				}}
				open={snackOpen}
				autoHideDuration={6000}
				onClose={handleSnackClose}
				message={snackMessage}
				action={
					<React.Fragment>
						<IconButton size="small" aria-label="close" color="inherit" onClick={handleSnackClose}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</React.Fragment>
				}
			/>
		</Container>
	);
}

export default Home;
