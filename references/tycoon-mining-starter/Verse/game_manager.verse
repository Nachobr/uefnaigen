using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

game_manager := class(creative_device):

    @editable
    ResourceTrigger : trigger_device = trigger_device{}
    @editable
    SellButton : button_device = button_device{}
    @editable
    UpgradeButton : button_device = button_device{}
    @editable
    GateBarrier : barrier_device = barrier_device{}
    @editable
    CurrencyTracker : tracker_device = tracker_device{}

    OnBegin<override, suspends>():void =
        Print("Mining Empire Starter GameManager ready")
