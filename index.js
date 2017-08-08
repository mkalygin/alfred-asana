'use strict';

const url = require('url');
const alfy = require('alfy');
const isNil = require('lodash.isnil');
const alfredNotifier = require('alfred-notifier');

alfredNotifier();

const ASANA_OPT_FIELDS = 'id,name,this.assignee.name,this.projects.name,' +
                         'custom_fields,completed,notes,tags';

const ASANA_BASE_URL = 'https://app.asana.com/0/';
const WORKSPACE_ID   = process.env.WORKSPACE_ID;
const ACCESS_TOKEN   = process.env.ACCESS_TOKEN;
const TASK           = process.env.TASK;
const MODE           = process.argv.pop();

const getProjectNames = (projects) => {
  projects = projects.map(project => project.name).join(', ');
  return `Projects: ${projects}`;
};

const getAssigneeName = ({ name }) => {
  return `Assigned to ${name}`;
};

const getSubtitle = ({ projects, assignee }) => {
  let subtitle = '';

  if (!isNil(projects)) {
    subtitle += getProjectNames(projects);
  }

  if (!isNil(assignee)) {
    subtitle += ` | ${getAssigneeName(assignee)}`;
  }

  return subtitle;
};

const getTask = (task) => {
  // NOTE: https://github.com/sindresorhus/alfy/issues/43
  const alfredworkflow = {
    arg: task.name,
    variables: { TASK: JSON.stringify(task) },
  };

  const arg = MODE === 'fields'
              ? url.resolve(ASANA_BASE_URL, `${WORKSPACE_ID}/${task.id}`)
              : JSON.stringify({ alfredworkflow });

  return {
    uid:          `${WORKSPACE_ID}/${task.id}`,
    title:        task.completed ? `✅ ${task.name}` : task.name,
    autocomplete: task.name,
    subtitle:     getSubtitle(task),
    arg:          arg,
  };
};

const getNotes = ({ notes }) => {
  return {
    title:    'Notes',
    subtitle: notes,
    icon:     { path: 'icons/notes.png' },
    arg:      notes,
  };
};

const getField = (field) => {
  let value = field[`${field.type}_value`] || '';

  if (field.type === 'enum') {
    value = value.name || '';
  }

  return {
    title:    field.name,
    subtitle: value,
    icon:     { path: 'icons/field.png' },
    arg:      value,
  };
};

const getCustomFields = ({ custom_fields }) => {
  return custom_fields.map(getField);
};

const getTaskWithCustomFields = (task) => {
  return [
    getTask(task),
    getNotes(task),
    ...getCustomFields(task)
  ];
};

const fetchTaskList = () => {
  alfy
    .fetch(`https://app.asana.com/api/1.0/workspaces/${WORKSPACE_ID}/typeahead`, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      },
      query: {
        query:      alfy.input,
        type:       'task',
        opt_fields: ASANA_OPT_FIELDS,
      }
    })
    .then(({ data }) => {
      alfy.output(data.map(getTask));
    });
};

const fetchCustomFieldList = () => {
  const task = JSON.parse(TASK);
  alfy.output(getTaskWithCustomFields(task));
};

if (MODE === 'fields') {
  fetchCustomFieldList();
} else {
  fetchTaskList();
}
