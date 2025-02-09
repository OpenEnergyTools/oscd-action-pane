import { fixture } from '@open-wc/testing';
import { html } from 'lit';

import { visualDiff } from '@web/test-runner-visual-regression';

import { sendMouse } from '@web/test-runner-commands';

import { MdIcon } from '@scopedelement/material-web/icon/MdIcon.js';

import './oscd-action-pane.js';

window.customElements.define('md-icon', MdIcon);

const factor = process.env.CI ? 2 : 1;

function timeout(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms * factor);
  });
}

mocha.timeout(2000 * factor);

document.body.style.width = '600px';
document.body.style.height = '600px';

describe('oscd-action-pane', () => {
  let element: HTMLDivElement;
  const title = 'Test Title';
  const icon = 'edit';

  afterEach(() => element.remove());

  describe('with calculated levels', () => {
    beforeEach(async () => {
      element = await fixture(
        html`<div>
          <oscd-action-pane
            .label=${title}
            .icon=${icon}
            highlighted
            .level=${1}
          >
            level 1, title, custom icon, highlighted
            <md-icon slot="icon">delete</md-icon>
            <oscd-action-pane .icon=${icon} .label=${'label'} secondary>
              set level 1, icon, secondary level below the rest
              <oscd-action-pane .label=${title}>
                level 2 selected
                <oscd-action-pane
                  .label=${title}
                  .icon=${icon}
                  secondary
                  highlighted
                >
                  level 3, secondary highlighted
                  <oscd-action-pane> level 4 </oscd-action-pane>
                </oscd-action-pane>
              </oscd-action-pane>
              <oscd-action-pane .label=${title} .icon=${icon} secondary level
            </oscd-action-pane>
          </oscd-action-pane>
          <div></div>
        </div>`
      );
      document.body.prepend(element);
    });

    it('displays the title', async () => {
      await timeout(500);
      await visualDiff(element, 'oscd-action-pane');
    });
  });

  describe('with defined levels', () => {
    beforeEach(async () => {
      element = await fixture(
        html`<div>
          <oscd-action-pane
            .label=${title}
            .icon=${icon}
            highlighted
            .level=${2}
          >
            level 1, title, custom icon, highlighted
            <md-icon slot="icon">delete</md-icon>
            <oscd-action-pane .icon=${icon} .label=${'label'} secondary>
              level 2, icon, secondary level below the rest
              <oscd-action-pane .label=${title}>
                level 3 selected
                <oscd-action-pane
                  .label=${title}
                  .icon=${icon}
                  secondary
                  highlighted
                >
                  level 4, secondary highlighted
                  <oscd-action-pane> level 4 </oscd-action-pane>
                </oscd-action-pane>
              </oscd-action-pane>
              <oscd-action-pane .label=${title} .icon=${icon} secondary level
            </oscd-action-pane>
          </oscd-action-pane>
          <div></div>
        </div>`
      );
      document.body.prepend(element);
    });

    it('clicked', async () => {
      await sendMouse({ type: 'click', position: [200, 400] }); // focus input
      await timeout(500);
      await visualDiff(element, 'oscd-action-pane-clicked');
    });
  });
});
