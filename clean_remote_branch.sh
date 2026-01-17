#!/usr/bin/env bash

set -euo pipefail

remote_branches=()
SELECTED_BRANCH=""
protected_branches=(
	"origin/gh-pages"
	"origin/main"
)
display_branches=()

function is_protected_branch() {
	local candidate="$1"
	for p in "${protected_branches[@]}"; do
		if [[ "$p" == "$candidate" ]]; then
			return 0
		fi
	done
	return 1
}

function ensure_git_repo() {
	if ! git rev-parse --git-dir >/dev/null 2>&1; then
		echo "Error: This script must be run inside a git repository." >&2
		exit 1
	fi
}

function load_remote_branches() {
	remote_branches=()
	# Use local remote-tracking branches view for listing
	while IFS= read -r line; do
		# Trim leading spaces from `git branch -r` output
		local branch=${line##* }
		[[ -z ${branch} ]] && continue
		# Skip symbolic HEAD pointers
		[[ ${branch} == */HEAD ]] && continue
		remote_branches+=("${branch}")
	done < <(git branch -r | grep -v -- '->')
}

function display_remote_branches() {
	build_display_branches
	echo "Select a remote branch to delete:"
	for i in "${!display_branches[@]}"; do
		printf "  %2d) %s\n" "$((i + 1))" "${display_branches[$i]}"
	done
}

function prompt_branch_selection() {
	display_remote_branches
	read -rp "Enter the number of the branch to delete (or press Enter to cancel): " selection

	if [[ -z ${selection:-} ]]; then
		SELECTED_BRANCH=""
		return 0
	fi

	if ! [[ ${selection} =~ ^[0-9]+$ ]] || (( selection < 1 || selection > ${#display_branches[@]} )); then
		echo "Invalid selection." >&2
		return 1
	fi

	SELECTED_BRANCH="${display_branches[$((selection - 1))]}"
	return 0
}

function build_display_branches() {
	display_branches=()
	# Include only non-protected remote branches
	for b in "${remote_branches[@]}"; do
		if ! is_protected_branch "$b"; then
			display_branches+=("$b")
		fi
	done
}

function confirm_deletion() {
	local branch="$1"
	read -rp "Are you sure you want to delete ${branch}? (y/N): " confirm
	local normalized
	normalized=$(echo "${confirm:-}" | tr '[:upper:]' '[:lower:]')

	if [[ ${normalized} == "y" || ${normalized} == "yes" ]]; then
		return 0
	fi

	return 1
}

function delete_remote_branch() {
	local branch="$1"
	local remote_name=${branch%%/*}
	local branch_name=${branch#*/}
	# Safety: prevent deletion of protected branches even if selected
	if is_protected_branch "$branch"; then
		echo "Branch $branch is protected and will not be deleted." >&2
		return 1
	fi
	git push "$remote_name" --delete "$branch_name"
}

function main() {
	ensure_git_repo
	load_remote_branches

	echo "Found ${#remote_branches[@]} remote branches."
	build_display_branches

	if [[ ${#remote_branches[@]} -eq 0 ]]; then
		echo "No remote branches found."
		exit 0
	fi

	if [[ ${#display_branches[@]} -eq 0 ]]; then
		echo "No deletable remote branches found (all are protected)."
		exit 0
	fi

	SELECTED_BRANCH=""
	if ! prompt_branch_selection; then
		exit 1
	fi

	if [[ -z ${SELECTED_BRANCH} ]]; then
		echo "Deletion cancelled."
		exit 0
	fi

	if ! confirm_deletion "${SELECTED_BRANCH}"; then
		echo "Deletion cancelled."
		exit 0
	fi

	delete_remote_branch "${SELECTED_BRANCH}"
}

main "$@"
