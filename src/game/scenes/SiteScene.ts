import Phaser from 'phaser'

/**
 * Placeholder for the in-Site gameplay scene. Proves the Phaser boot path works end to end;
 * movement, tasks, kills, sabotage and meetings are not implemented yet.
 */
export class SiteScene extends Phaser.Scene {
  constructor() {
    super('site')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a1a')
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Site online.\nGameplay coming soon.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#eeeeee',
        align: 'center',
      })
      .setOrigin(0.5)
  }
}
