using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

currency_manager := class(creative_device):

    @editable
    SellTrigger : trigger_device = trigger_device{}
    var SawmillUpgradeTrigger : device = device{}

    OnBegin<override, suspends>():void =
        if (SellTrigger := self.SellTrigger) { SellTrigger.OnEvent.Subscribe(OnSellEvent) }
        if (SawmillUpgradeTrigger := self.SawmillUpgradeTrigger) { SawmillUpgradeTrigger.OnEvent.Subscribe(OnUpgradeEvent) }
        StartCurrencyManagement()

    HandleSell(Agent:agent):void =
        if (Player := Agent.Player) { Player.GrantResource(10, "gold") }

    HandleUpgrade():void =
        if (SawmillUpgradeTrigger := self.SawmillUpgradeTrigger) { SawmillUpgradeTrigger.ProcessUpgrade() }
        UpdateCurrencySinks()
