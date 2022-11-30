const core = require('@actions/core');
const github = require('@actions/github');

async function main() {
    const labelsStr = core.getInput('labels');
    const sizeLabels = JSON.parse(labelsStr);
    const issue = github.context.issue
    const token = core.getInput('token');

    const octokit = github.getOctokit(token);
    const {data: activeLabels} = await octokit.rest.issues.listLabelsOnIssue({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
    });


    const {data: pullRequest} = await octokit.rest.pulls.get({
        owner: issue.owner,
        repo: issue.repo,
        pull_number: issue.number,
    });

    console.log(pullRequest.id);

    const linesOfCode = pullRequest.additions + pullRequest.deletions;

    let labelToAdd = null;
    for (const label of sizeLabels) {
        const size = label.size
        if (size > linesOfCode) {
            labelToAdd = label;
            break;
        }
    }

    if (labelToAdd === null) {
        labelToAdd = sizeLabels.find(label => label.size === -1);
        if (labelToAdd === undefined) {
            labelToAdd = sizeLabels[sizeLabels.length - 1];
        }
    }

    const activeLabelNames = activeLabels.map(label => label.name);
    const labelsToRemove = activeLabelNames.filter(
        activeLabel => sizeLabels.find(
            sizeLabel => sizeLabel.name === activeLabel
                && sizeLabel.name !== labelToAdd.name
        )
    );

    for (const label of labelsToRemove) {
        await octokit.rest.issues.removeLabel({
            owner: issue.owner,
            repo: issue.repo,
            issue_number: issue.number,
            name: label,
        });
    }

    if (!activeLabelNames.includes(labelToAdd.name)) {
        await octokit.rest.issues.addLabels({
            owner: issue.owner,
            repo: issue.repo,
            issue_number: issue.number,
            labels: [labelToAdd.name],
        })
    }
}

main().catch(err => core.setFailed(err.message));