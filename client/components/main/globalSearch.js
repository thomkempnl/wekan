const subManager = new SubsManager();

BlazeComponent.extendComponent({
  events() {
    return [
      {
        'click .js-due-cards-view-change': Popup.open('globalSearchViewChange'),
      },
    ];
  },
}).register('globalSearchHeaderBar');

Template.globalSearch.helpers({
  userId() {
    return Meteor.userId();
  },
});

BlazeComponent.extendComponent({
  events() {
    return [
      {
        'click .js-due-cards-view-me'() {
          Utils.setDueCardsView('me');
          Popup.close();
        },

        'click .js-due-cards-view-all'() {
          Utils.setDueCardsView('all');
          Popup.close();
        },
      },
    ];
  },
}).register('globalSearchViewChangePopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.searching = new ReactiveVar(false);
    this.hasResults = new ReactiveVar(false);
    this.hasQueryErrors = new ReactiveVar(false);
    this.query = new ReactiveVar('');
    this.resultsHeading = new ReactiveVar('');
    this.searchLink = new ReactiveVar(null);
    this.queryParams = null;
    this.parsingErrors = [];
    this.resultsCount = 0;
    this.totalHits = 0;
    this.queryErrors = null;
    Meteor.subscribe('setting');
    if (Session.get('globalQuery')) {
      this.searchAllBoards(Session.get('globalQuery'));
    }
  },

  resetSearch() {
    this.searching.set(false);
    this.hasResults.set(false);
    this.hasQueryErrors.set(false);
    this.resultsHeading.set('');
    this.parsingErrors = [];
    this.resultsCount = 0;
    this.totalHits = 0;
    this.queryErrors = null;
  },

  results() {
    // eslint-disable-next-line no-console
    // console.log('getting results');
    if (this.queryParams) {
      const results = Cards.globalSearch(this.queryParams);
      this.queryErrors = results.errors;
      // eslint-disable-next-line no-console
      // console.log('errors:', this.queryErrors);
      if (this.errorMessages().length) {
        this.hasQueryErrors.set(true);
        return null;
      }

      if (results.cards) {
        const sessionData = SessionData.findOne({ userId: Meteor.userId() });
        this.totalHits = sessionData.totalHits;
        this.resultsCount = results.cards.count();
        this.resultsHeading.set(this.getResultsHeading());
        return results.cards;
      }
    }
    this.resultsCount = 0;
    return [];
  },

  errorMessages() {
    const messages = [];

    if (this.queryErrors) {
      this.queryErrors.notFound.boards.forEach(board => {
        messages.push({ tag: 'board-title-not-found', value: board });
      });
      this.queryErrors.notFound.swimlanes.forEach(swim => {
        messages.push({ tag: 'swimlane-title-not-found', value: swim });
      });
      this.queryErrors.notFound.lists.forEach(list => {
        messages.push({ tag: 'list-title-not-found', value: list });
      });
      this.queryErrors.notFound.labels.forEach(label => {
        messages.push({ tag: 'label-not-found', value: label });
      });
      this.queryErrors.notFound.users.forEach(user => {
        messages.push({ tag: 'user-username-not-found', value: user });
      });
      this.queryErrors.notFound.members.forEach(user => {
        messages.push({ tag: 'user-username-not-found', value: user });
      });
      this.queryErrors.notFound.assignees.forEach(user => {
        messages.push({ tag: 'user-username-not-found', value: user });
      });
    }

    if (this.parsingErrors.length) {
      this.parsingErrors.forEach(err => {
        messages.push(err);
      });
    }

    return messages;
  },

  searchAllBoards(query) {
    this.query.set(query);

    this.resetSearch();

    if (!query) {
      return;
    }

    this.searching.set(true);

    // eslint-disable-next-line no-console
    // console.log('query:', query);

    const reOperator1 = /^((?<operator>\w+):|(?<abbrev>[#@]))(?<value>\w+)(\s+|$)/;
    const reOperator2 = /^((?<operator>\w+):|(?<abbrev>[#@]))(?<quote>["']*)(?<value>.*?)\k<quote>(\s+|$)/;
    const reText = /^(?<text>\S+)(\s+|$)/;
    const reQuotedText = /^(?<quote>["'])(?<text>\w+)\k<quote>(\s+|$)/;

    const colorMap = {};
    colorMap[TAPi18n.__('color-black')] = 'black';
    colorMap[TAPi18n.__('color-blue')] = 'blue';
    colorMap[TAPi18n.__('color-crimson')] = 'crimson';
    colorMap[TAPi18n.__('color-darkgreen')] = 'darkgreen';
    colorMap[TAPi18n.__('color-gold')] = 'gold';
    colorMap[TAPi18n.__('color-gray')] = 'gray';
    colorMap[TAPi18n.__('color-green')] = 'green';
    colorMap[TAPi18n.__('color-indigo')] = 'indigo';
    colorMap[TAPi18n.__('color-lime')] = 'lime';
    colorMap[TAPi18n.__('color-magenta')] = 'magenta';
    colorMap[TAPi18n.__('color-mistyrose')] = 'mistyrose';
    colorMap[TAPi18n.__('color-navy')] = 'navy';
    colorMap[TAPi18n.__('color-orange')] = 'orange';
    colorMap[TAPi18n.__('color-paleturquoise')] = 'paleturquoise';
    colorMap[TAPi18n.__('color-peachpuff')] = 'peachpuff';
    colorMap[TAPi18n.__('color-pink')] = 'pink';
    colorMap[TAPi18n.__('color-plum')] = 'plum';
    colorMap[TAPi18n.__('color-purple')] = 'purple';
    colorMap[TAPi18n.__('color-red')] = 'red';
    colorMap[TAPi18n.__('color-saddlebrown')] = 'saddlebrown';
    colorMap[TAPi18n.__('color-silver')] = 'silver';
    colorMap[TAPi18n.__('color-sky')] = 'sky';
    colorMap[TAPi18n.__('color-slateblue')] = 'slateblue';
    colorMap[TAPi18n.__('color-white')] = 'white';
    colorMap[TAPi18n.__('color-yellow')] = 'yellow';

    const operatorMap = {};
    operatorMap[TAPi18n.__('operator-board')] = 'boards';
    operatorMap[TAPi18n.__('operator-board-abbrev')] = 'boards';
    operatorMap[TAPi18n.__('operator-swimlane')] = 'swimlanes';
    operatorMap[TAPi18n.__('operator-swimlane-abbrev')] = 'swimlanes';
    operatorMap[TAPi18n.__('operator-list')] = 'lists';
    operatorMap[TAPi18n.__('operator-list-abbrev')] = 'lists';
    operatorMap[TAPi18n.__('operator-label')] = 'labels';
    operatorMap[TAPi18n.__('operator-label-abbrev')] = 'labels';
    operatorMap[TAPi18n.__('operator-user')] = 'users';
    operatorMap[TAPi18n.__('operator-user-abbrev')] = 'users';
    operatorMap[TAPi18n.__('operator-member')] = 'members';
    operatorMap[TAPi18n.__('operator-member-abbrev')] = 'members';
    operatorMap[TAPi18n.__('operator-assignee')] = 'assignees';
    operatorMap[TAPi18n.__('operator-assignee-abbrev')] = 'assignees';
    operatorMap[TAPi18n.__('operator-is')] = 'is';

    // eslint-disable-next-line no-console
    // console.log('operatorMap:', operatorMap);
    const params = {
      boards: [],
      swimlanes: [],
      lists: [],
      users: [],
      members: [],
      assignees: [],
      labels: [],
      is: [],
    };

    let text = '';
    while (query) {
      m = query.match(reOperator1);
      if (!m) {
        m = query.match(reOperator2);
        if (m) {
          query = query.replace(reOperator2, '');
        }
      } else {
        query = query.replace(reOperator1, '');
      }
      if (m) {
        let op;
        if (m.groups.operator) {
          op = m.groups.operator.toLowerCase();
        } else {
          op = m.groups.abbrev;
        }
        if (op in operatorMap) {
          let value = m.groups.value;
          if (operatorMap[op] === 'labels') {
            if (value in colorMap) {
              value = colorMap[value];
            }
          }
          params[operatorMap[op]].push(value);
        } else {
          this.parsingErrors.push({
            tag: 'operator-unknown-error',
            value: op,
          });
        }
        continue;
      }

      m = query.match(reQuotedText);
      if (!m) {
        m = query.match(reText);
        if (m) {
          query = query.replace(reText, '');
        }
      } else {
        query = query.replace(reQuotedText, '');
      }
      if (m) {
        text += (text ? ' ' : '') + m.groups.text;
      }
    }

    // eslint-disable-next-line no-console
    // console.log('text:', text);
    params.text = text;

    // eslint-disable-next-line no-console
    // console.log('params:', params);

    this.queryParams = params;

    this.autorun(() => {
      const handle = subManager.subscribe('globalSearch', params);
      Tracker.nonreactive(() => {
        Tracker.autorun(() => {
          // eslint-disable-next-line no-console
          // console.log('ready:', handle.ready());
          if (handle.ready()) {
            this.searching.set(false);
            this.hasResults.set(true);
          }
        });
      });
    });
  },

  getResultsHeading() {
    if (this.resultsCount === 0) {
      return TAPi18n.__('no-cards-found');
    } else if (this.resultsCount === 1) {
      return TAPi18n.__('one-card-found');
    } else if (this.resultsCount === this.totalHits) {
      return TAPi18n.__('n-cards-found', this.resultsCount);
    }

    return TAPi18n.__('n-n-of-n-cards-found', {
      start: 1,
      end: this.resultsCount,
      total: this.totalHits,
    });
  },

  getSearchHref() {
    const baseUrl = window.location.href.replace(/([?#].*$|\s*$)/, '');
    return `${baseUrl}?q=${encodeURIComponent(this.query.get())}`;
  },

  searchInstructions() {
    tags = {
      operator_board: TAPi18n.__('operator-board'),
      operator_list: TAPi18n.__('operator-list'),
      operator_swimlane: TAPi18n.__('operator-swimlane'),
      operator_label: TAPi18n.__('operator-label'),
      operator_label_abbrev: TAPi18n.__('operator-label-abbrev'),
      operator_user: TAPi18n.__('operator-user'),
      operator_user_abbrev: TAPi18n.__('operator-user-abbrev'),
      operator_member: TAPi18n.__('operator-member'),
      operator_member_abbrev: TAPi18n.__('operator-member-abbrev'),
      operator_assignee: TAPi18n.__('operator-assignee'),
      operator_assignee_abbrev: TAPi18n.__('operator-assignee-abbrev'),
    };

    text = `# ${TAPi18n.__('globalSearch-instructions-heading')}`;
    text += `\n${TAPi18n.__('globalSearch-instructions-description', tags)}`;
    text += `\n${TAPi18n.__('globalSearch-instructions-operators', tags)}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-board',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-list',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-swimlane',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-label',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-hash',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-user',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__('globalSearch-instructions-operator-at', tags)}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-member',
      tags,
    )}`;
    text += `\n* ${TAPi18n.__(
      'globalSearch-instructions-operator-assignee',
      tags,
    )}`;

    text += `\n## ${TAPi18n.__('heading-notes')}`;
    text += `\n* ${TAPi18n.__('globalSearch-instructions-notes-1', tags)}`;
    text += `\n* ${TAPi18n.__('globalSearch-instructions-notes-2', tags)}`;
    text += `\n* ${TAPi18n.__('globalSearch-instructions-notes-3', tags)}`;
    text += `\n* ${TAPi18n.__('globalSearch-instructions-notes-4', tags)}`;
    text += `\n* ${TAPi18n.__('globalSearch-instructions-notes-5', tags)}`;

    return text;
  },

  events() {
    return [
      {
        'submit .js-search-query-form'(evt) {
          evt.preventDefault();
          this.searchAllBoards(evt.target.searchQuery.value);
        },
      },
    ];
  },
}).register('globalSearch');
