// playwright-dev-page.ts
import { Locator, Page, expect } from "@playwright/test";
import BasePage from "../Base";
import { GridPage } from "./Grid";
import { FormPage } from "./Form";
import { ExpandedFormPage } from "./ExpandedForm";
import { ChildList } from "./Grid/Column/LTAR/ChildList";
import { LinkRecord } from "./Grid/Column/LTAR/LinkRecord";
import { TreeViewPage } from "./TreeView";
import { SettingsPage } from "./Settings";
import { ViewSidebarPage } from "./ViewSidebar";
import { GalleryPage } from "./Gallery";
import { KanbanPage } from "./Kanban";
import { ToolbarPage } from "./common/Toolbar";
import { ImportAirtablePage } from "./Import/Airtable";
import { WebhookFormPage } from "./WebhookForm";

export class DashboardPage extends BasePage {
  readonly project: any;
  readonly tablesSideBar: Locator;
  readonly tabBar: Locator;
  readonly treeView: TreeViewPage;
  readonly grid: GridPage;
  readonly gallery: GalleryPage;
  readonly form: FormPage;
  readonly kanban: KanbanPage;
  readonly expandedForm: ExpandedFormPage;
  readonly webhookForm: WebhookFormPage;
  readonly childList: ChildList;
  readonly linkRecord: LinkRecord;
  readonly settings: SettingsPage;
  readonly viewSidebar: ViewSidebarPage;
  readonly importAirtable: ImportAirtablePage;

  constructor(rootPage: Page, project: any) {
    super(rootPage);
    this.project = project;
    this.tablesSideBar = rootPage.locator(".nc-treeview-container");
    this.tabBar = rootPage.locator(".nc-tab-bar");
    this.treeView = new TreeViewPage(this, project);
    this.grid = new GridPage(this);
    this.gallery = new GalleryPage(this);
    this.form = new FormPage(this);
    this.kanban = new KanbanPage(this);
    this.expandedForm = new ExpandedFormPage(this);
    this.webhookForm = new WebhookFormPage(this);
    this.childList = new ChildList(this);
    this.linkRecord = new LinkRecord(this);
    this.settings = new SettingsPage(this);
    this.viewSidebar = new ViewSidebarPage(this);
    this.importAirtable = new ImportAirtablePage(this);
  }

  get() {
    return this.rootPage.locator("html");
  }

  async goto() {
    await this.rootPage.goto(`/#/nc/${this.project.id}/auth`);
  }

  async gotoSettings() {
    await this.rootPage.locator('[pw-data="nc-project-menu"]').click();
    await this.rootPage
      .locator('div.nc-project-menu-item:has-text(" Team & Settings")')
      .click();
  }

  async verifyInTabBar({ title }: { title: string }) {
    await this.tabBar
      .textContent()
      .then((text) => expect(text).toContain(title));
  }

  async closeTab({ title }: { title: string }) {
    let tab = await this.tabBar.locator(`.ant-tabs-tab:has-text("${title}")`);
    await tab.locator("button.ant-tabs-tab-remove").click();

    // fix me!
    // await tab.waitFor({ state: "detached" });
    await this.rootPage.waitForTimeout(2000);
  }

  async clickHome() {
    await this.rootPage.locator('[data-cy="nc-noco-brand-icon"]').click();
  }

  async waitForTabRender({ title }: { title: string }) {
    await this.get().locator('[pw-data="grid-id-column"]').waitFor();

    await this.tabBar
      .locator(`.ant-tabs-tab-active:has-text("${title}")`)
      .waitFor();

    // wait active tab animation to finish
    await expect
      .poll(async () => {
        return await this.tabBar
          .locator(`[data-pw="nc-root-tabs-${title}"]`)
          .evaluate((el) => {
            return window.getComputedStyle(el).getPropertyValue("color");
          });
      })
      .toBe("rgb(67, 81, 232)"); // active tab text color

    await this.get()
      .locator('[pw-data="grid-load-spinner"]')
      .waitFor({ state: "hidden" });

    await expect(this.rootPage).toHaveURL(
      `/#/nc/${this.project.id}/table/${title}`
    );
  }

  // Project page language menu
  async openLanguageMenu() {
    await this.rootPage.locator(".nc-menu-translate").click();
  }

  async selectLanguage({ index }: { index: number }) {
    let modal = await this.rootPage.locator(".nc-dropdown-menu-translate");
    await modal.locator(`.ant-dropdown-menu-item`).nth(index).click();
  }

  async verifyLanguage(param: { json: any }) {
    let title = await this.rootPage
      .locator(`.nc-project-page-title`)
      .textContent();
    let menu = await this.rootPage
      .locator(`.nc-new-project-menu`)
      .textContent();
    console.log(title, menu);
    expect(title).toContain(param.json.title.myProject);
    expect(menu).toContain(param.json.title.newProj);
    await this.rootPage
      .locator(`[placeholder="${param.json.activity.searchProject}"]`)
      .waitFor();
  }

  // create project
  async createProject({
    name = "sample",
    type = "xcdb",
  }: {
    name?: string;
    type?: string;
  }) {
    // fix me! wait for page to be rendered completely
    await this.rootPage.waitForTimeout(1000);
    await this.rootPage.locator(".nc-new-project-menu").click();

    const createProjectMenu = await this.rootPage.locator(
      ".nc-dropdown-create-project"
    );
    if (type === "xcdb") {
      await createProjectMenu
        .locator(`.ant-dropdown-menu-title-content`)
        .nth(0)
        .click();
    } else {
      await createProjectMenu
        .locator(`.ant-dropdown-menu-title-content`)
        .nth(1)
        .click();
    }

    await this.rootPage.locator(`.nc-metadb-project-name`).waitFor();
    await this.rootPage.locator(`input.nc-metadb-project-name`).fill(name);
    await this.rootPage.locator(`input.nc-metadb-project-name`).press("Enter");
  }
}
