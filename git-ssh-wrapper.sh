#!/bin/bash
exec ssh -i /home/pyc/ai-agent-pro-source/AI-Agent-pro/ssh_private_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=no "$@"
