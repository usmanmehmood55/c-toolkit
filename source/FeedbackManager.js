const vscode = require('vscode');

const FEEDBACK_PROMPT_SHOWN_KEY = 'feedbackPromptShown';
const SUCCESSFUL_BUILD_COUNT_KEY = 'successfulBuildCount';
const BUILDS_BEFORE_PROMPT = 3;
const FEEDBACK_URL = 'https://github.com/usmanmehmood55/c-toolkit/issues/new?template=feedback.md';

/** @type {vscode.ExtensionContext|undefined} */
let extensionContext;

/**
 * Connects feedback state to the current extension installation.
 * @param {vscode.ExtensionContext} context Extension context.
 */
function Initialize(context)
{
    extensionContext = context;
    context.subscriptions.push(vscode.commands.registerCommand('extension.showFeedbackPrompt', ShowFeedbackPrompt));
}

/**
 * Opens the feedback invitation without changing its automatic one-time state.
 * @returns {Promise<void>}
 */
async function ShowFeedbackPrompt()
{
    const selection = await vscode.window.showInformationMessage(
        'How has C C++ Toolkit been so far? Your feedback helps improve the experience.',
        'Share Feedback', 'No Thanks');
    if (selection === 'Share Feedback')
    {
        await vscode.env.openExternal(vscode.Uri.parse(FEEDBACK_URL));
    }
}

/**
 * Records a successful build and asks once after the user has some experience.
 * @returns {Promise<void>}
 */
async function RecordSuccessfulBuild()
{
    if (!extensionContext || extensionContext.globalState.get(FEEDBACK_PROMPT_SHOWN_KEY, false))
    {
        return;
    }

    const buildCount = extensionContext.globalState.get(SUCCESSFUL_BUILD_COUNT_KEY, 0) + 1;
    await extensionContext.globalState.update(SUCCESSFUL_BUILD_COUNT_KEY, buildCount);
    if (buildCount < BUILDS_BEFORE_PROMPT)
    {
        return;
    }

    // Record before showing so closing the notification cannot make it return.
    await extensionContext.globalState.update(FEEDBACK_PROMPT_SHOWN_KEY, true);
    await ShowFeedbackPrompt();
}

module.exports =
{
    Initialize,
    RecordSuccessfulBuild,
    ShowFeedbackPrompt,
};
