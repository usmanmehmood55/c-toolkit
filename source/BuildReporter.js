const vscode = require('vscode');

const OutputModes =
{
    GUIDED  : 'guided',
    COMMANDS: 'commands',
    VERBOSE : 'verbose',
};

/**
 * Presents build activity in beginner-friendly stages while retaining commands.
 */
class BuildReporter
{
    /** Creates the build activity output channel. */
    constructor()
    {
        this.outputChannel = vscode.window.createOutputChannel('C C++ Toolkit: Build');
    }

    /** @returns {string} Configured output mode. */
    get mode()
    {
        return vscode.workspace.getConfiguration('c-cpp-toolkit').get('outputMode', OutputModes.GUIDED);
    }

    /**
     * Starts a new activity group.
     * @param {string} title Activity title.
     */
    Start(title)
    {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(`── ${title} ──`);
        if (this.mode !== OutputModes.GUIDED)
        {
            this.Show();
        }
    }

    /** @param {string} message Completed stage. */
    Pass(message)
    {
        this.outputChannel.appendLine(`✓ ${message}`);
    }

    /** @param {string} message Active stage. */
    Active(message)
    {
        this.outputChannel.appendLine(`→ ${message}`);
    }

    /** @param {string} message Failed stage. */
    Fail(message)
    {
        this.outputChannel.appendLine(`✕ ${message}`);
    }

    /**
     * Records a reproducible command.
     * @param {string} command Executable.
     * @param {string[]} args Command arguments.
     */
    Command(command, args)
    {
        this.outputChannel.appendLine(`  $ ${[command, ...args].map(quoteArgument).join(' ')}`);
    }

    /**
     * Records process output in verbose mode.
     * @param {string} output Process output.
     */
    Output(output)
    {
        if (this.mode === OutputModes.VERBOSE && output.trim())
        {
            this.outputChannel.append(output);
        }
    }

    /** @param {string} output Failure output. */
    FailureOutput(output)
    {
        if (output.trim())
        {
            this.outputChannel.appendLine('');
            this.outputChannel.appendLine(output.trimEnd());
        }
    }

    /**
     * Reveals build details.
     * @param {boolean} preserveFocus Whether to keep focus in the editor.
     */
    Show(preserveFocus = true)
    {
        this.outputChannel.show(preserveFocus);
    }

    /** Releases the output channel when the extension is deactivated. */
    dispose()
    {
        this.outputChannel.dispose();
    }
}

/**
 * Quotes an argument for readable, copyable command output.
 * @param {string} argument Command argument.
 * @returns {string} Quoted argument when needed.
 */
function quoteArgument(argument)
{
    return /\s/.test(argument) ? `"${argument.replace(/"/g, '\\"')}"` : argument;
}

module.exports =
{
    BuildReporter: new BuildReporter(),
    OutputModes,
};
