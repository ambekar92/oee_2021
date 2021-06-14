require "libs/utilities.pl";


my $DEV = $ARGV[1];
my $opr = $ARGV[2];

&Parse_Config();

my $nps_name = $TBDEVICE{$TBDEVICE{$DEV}."_NPS_NAME"};
my $nps_ip   = $TBDEVICE{$TBDEVICE{$nps_name}."_MNGT_IP"};
my $nps_port, $apIpaddr;

if ($DEV =~ m/EXT_AP/) {
	$nps_port = $TBDEVICE{$TBDEVICE{$DEV}."_NPS_PORT_POWER"};
	$apIpaddr = $TBDEVICE{$TBDEVICE{$DEV}."_TEST_IP"};
}

&Dprint($DEV, $DINF, "\n\ndev=$DEV nps_name=$nps_name nps_ip=$nps_ip nps_port=$nps_port\n\n", 1);

&nps_operation($nps_ip,$opr,$nps_port); 
sleep 2;

if ($opr =~ /on|boot/i) {
	my $cont = '1';
	my $max_retry = 10;
	while($cont) {
		$result = Send_System_CMD_Handler('HOST',"ping -c 1 $apIpaddr",0);
		$result =~ /(\d+)%\spacket loss/i;
		$cont = 0 unless $1;
		print "Access Point is not yet Up, Lets try after 10 seconds\n" if $cont; sleep 10;
		unless($max_retry)
		{
			print "Max Retry Done!!! AP is not reachable, Please check AP Connectivity and restar the test\n";
			$cont = 0;
		}
		$max_retry--;
	}
	print "Access Point $apIpaddr is Up, Let's wait another 20 seconds for AP Initialization\n";
	sleep 20;
}
