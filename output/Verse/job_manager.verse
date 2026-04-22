using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

job_manager := class(creative_device):

    @editable
    JobPlazaWorkTrigger : trigger_device = trigger_device{}

    OnBegin<override, suspends>():void =
        if (JobPlazaWorkTrigger := self.JobPlazaWorkTrigger):
        JobPlazaWorkTrigger.SomeEvent.Subscribe(OnJobPlazaWork)

    HandleJobWork(Agent:agent):void =
        if (Player := Agent.Player):
        if (JobCompletionEvent := Player.JobManager.GetJobCompletionEvent()):
        Player.SilverCurrency += 100;
        Player.Notify(SuccessMessage)
