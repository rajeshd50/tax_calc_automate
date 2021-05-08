import React from 'react';
import { render } from 'react-dom';

import '@fontsource/roboto';

import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';

import App from './App';
import theme from './theme';

render(<ThemeProvider theme={theme}>
    <CssBaseline/>
    <App/>
</ThemeProvider>, document.getElementById('root'));
