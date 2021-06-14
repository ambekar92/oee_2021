# !/usr/bin/env perl
#
#Purpose : This lib is to load BT and WLAN firmware for all chipset and for all interface
#
#Author : Mahesh Nahar        
################################################################################
#require('/root/BATS_Sanity/batslib.pl');
#require ('/root/BATS_Sanity/hci_def.pl');
use Cwd;
require ('DailySanity/batslib.pl');
require ('DailySanity/hci_def.pl');
require ('libs/utilities.pl');

our $localDir = cwd();

my $_CONFIG = 'sanity.conf';
###############################################################################
sub Load_Sanity_Conf_File
{
   my($conf) = $_CONFIG;
   my($line);   
   my(@bits);  

   if (!(-r $conf)) 
   {
       print "\n#############################################\n";
       print "You do not have a Sanity.conf file for Automation Testing requires \n";
       exit(1);
   } 

   open (INF, $conf) ; #|| die "ERROR opening $conf... \n";
   while ($line = <INF>) {
      chop($line);
      $line =~ s/#.*//g;
      if ( $line eq "") 
      { } else 
      {
         (@bits) = split(/=/,$line);   
          @_bits = split(/:/, $bits[1]); 
          if ($bits[0] =~ m/^#/)   
         { @bits = ''; }
		

         if ($line =~ m/DUT/i)
         {
            if (!exists $DEVICE{"$bits[0]"."port"} ) 	{ $DEVICE{"$bits[0]"."port"} = $_bits[0]; print "====$DEVICE{DUT.'port'}===";  }
            if (!exists $DEVICE{"$bits[0]"."spd"} ) 	{ $DEVICE{"$bits[0]"."spd"} = $_bits[1];  print "====$DEVICE{DUT.'spd'}===";}
			$bits[5] =~ s/\s+//g;
         } 
		   if ($line =~ m/^FW_LOC/)
         {
            if (!exists $DEVICE{"$bits[0]"."fw_loc"} ) 	{ $DEVICE{"$bits[0]"."fw_loc"} = $bits[1]; }     } 

		 if ($line =~ m/^ap_backEnd/)
         {
            if (!exists $DEVICE{"$bits[0]"."ip"} ) 		 { $DEVICE{"$bits[0]"."ip"} = $bits[1]; }
            if (!exists $DEVICE{"$bits[0]"."username"} ) { $DEVICE{"$bits[0]"."username"} = $bits[2]; }
            if (!exists $DEVICE{"$bits[0]"."password"} ) { $DEVICE{"$bits[0]"."password"} = $bits[3]; }
         } 
          if ($line =~ m/^ref/i)
         {
            if (!exists $DEVICE{"$bits[0]"."port"} ) 	{ $DEVICE{"$bits[0]"."port"} = $_bits[0]; }
            if (!exists $DEVICE{"$bits[0]"."spd"} ) 	{ $DEVICE{"$bits[0]"."spd"} = $_bits[1]; }
			$bits[3] =~ s/\s+//g;
            if (!exists $DEVICE{"$bits[0]"."bd"} ) 		{ $DEVICE{"$bits[0]"."bd"} = $_bits[2]; }
         }
         if ($line =~ m/BUILD_SERVER/i)								
         { 
            if (!exists $DEVICE{"$bits[0]"."username"} ) 	{ $DEVICE{"$bits[0]"."username"} = $_bits[0]; }
            if (!exists $DEVICE{"$bits[0]"."password"} ) 	{ $DEVICE{"$bits[0]"."password"} = $_bits[1]; }
            if (!exists $DEVICE{"$bits[0]"."hw"} ) 	{ $DEVICE{"$bits[0]"."hw"} = $_bits[2]; }
            if (!exists $DEVICE{"$bits[0]"."wlan_intf"} ) 	{ $DEVICE{"$bits[0]"."wlan_intf"} = $_bits[3]; }
            if (!exists $DEVICE{"$bits[0]"."bt_intf"} ) 	{ $DEVICE{"$bits[0]"."bt_intf"} = $_bits[4]; }
      }
      if ($line =~ m/Email/i){ 
            if (!exists $DEVICE{"$bits[0]"."email"} ) 	{ $DEVICE{"$bits[0]"."email"} = $_bits[0]; }
          }  
      }
   }
}
###############################################################################
sub WLAN_Load {
	
	&Load_Sanity_Conf_File();
	
	my $build_wlan_intf = lc($DEVICE{BUILD_SERVER.'wlan_intf'});
	my $output = "/root/output.txt";
	my $HW = $DEVICE{BUILD_SERVER.'hw'};
	my $build_chip_value;
	my $wlan_driver_path;
	my $build_chip_id = substr $HW, 1, 4;

	($build_btchip_value,$build_chip_value,$build) = &load_chip_val($build_chip_id);
	
    @WLAN_driver_CMD = ("./unload", "./load $build_wlan_intf$build_chip_value");
    $wlan_driver_path = "bin_".$build_wlan_intf.$build_chip_value;
    chdir("/root/$build_chip_id/$build/$wlan_driver_path/"); 	
	
	##### To load driver 
	for(my $k=0; $k<=$_[0]; $k++){           ## this loop to load/unload WLAN mutile times
	
		   foreach my $CMD (@WLAN_driver_CMD){ 
		        print "\n $CMD";
		        system("$CMD");
		        select (undef, undef, undef, 1);
		    }
		    #Update USB interface WLAN version
		    if($build_wlan_intf =~ /USB/i){
		     system("./usbconfig reboot");
		     sleep 5;
		    }
		     system("iwpriv mlan0 version > $output");
		     open (FILE1, $output) or die ("\nSystem Failed to open file \n");
		     my @mlan_output = <FILE1>;
		     close FILE1;
		     sleep 2;
		     if(@mlan_output){
					foreach my $line (@mlan_output){
					 	  if($line !~ /version/i){ 
		                          print("\n WLAN Driver loading failed.\n");
		                          if($_[0]){
									   &monitor_result('error', "\n WLAN Driver loading failed..at iteration #$k\n");
									  }
		                          else{ &monitor_result('wlan_Load_Failed');}
		                           }
						  else{  
		                         print "\n $line =========WLAN Driver load is successful==========\n";}
							 }
		   		   }
		    else{
					if($_[0]){
						      &monitor_result('error', "\n WLAN Driver loading failed..at iteration #$k\n");}
		            else{     &monitor_result('wlan_Load_Failed');}
		         }    
		  }
	}
#############################################################################
####
## this section, as per HW and interface of BT, driver will be loaded 
####
##########################################################################
sub BT_Load{

	&Load_Sanity_Conf_File();
	
	my $build_bt_intf = $DEVICE{BUILD_SERVER.'bt_intf'};
	my $build_wlan_intf = $DEVICE{BUILD_SERVER.'wlan_intf'};
	my $output = "/root/output1.txt";
	my $HW = $DEVICE{BUILD_SERVER.'hw'};
	my $build_chip_id = substr $HW, 1, 4;
	my $build_chip_value;
	my ($app_uart_folder,$bin_uart_folder,$fwimage,$build);
	my $bt_driver_path;
	my $uart_port;
  
	($build_chip_value,$build_wlanchip_value,$build) = &load_chip_val($build_chip_id, $build_bt_intf);		
    
	chdir("/root/$build_chip_id/$build"); 
	system("hciconfig hci2 reset");

    if($build_bt_intf =~ /SD/i){
	
		         @BT_Driver_CMD = ("hciconfig hci2 down", "rmmod bt8xxx", "insmod bt$build_chip_value.ko"); 
		         $bt_driver_path = "bin_sd$build_chip_value"."_bt";}      
		         
	elsif($build_bt_intf =~ /UART/i){
	
			  system("ls /dev/ttyUSB* > $output"); ### determine UART interface
			  open (FILE, "$output") or &monitor_result('error',"\nSystem Failed to open file \n");
		      while (<FILE>){ 
			        chomp;
		            $_ =~ /USB(\d+)/;
		            $uart_port = $1;  
		         } 
             close FILE;
##########################################
	##Uart folder structure is different for starling and KF

	($build_btchip_value,$app_uart_folder,$bin_uart_folder,$build) = &load_val($build_chip_id, $build_bt_intf);

    $bt_driver_path = "$app_uart_folder/mfguart";

	if($build_chip_value =~ /(8797|8887)/){
					                       
	          $fwimage = "$build_wlan_intf"."$build_chip_value"."_uapsta.bin"; } 
    else { 
              $fwimage = "$build_wlan_intf"."$build_chip_value"."d"."_uapsta.bin";}
					          
##########################################	    

	$helper_download = "./fw_loader_linux /dev/ttyUSB$uart_port 115200 0 helper_uart_3000000.bin";
	$fw_download = "./fw_loader_linux /dev/ttyUSB$uart_port 3000000 1 ../../FwImage/$fwimage";
	$hci_attach = "sh /root/BATS/uart3M.sh $uart_port";

	system("chmod +x *");
	system("cp /root/$build_chip_value/$build/$bin_uart_folder/hci_uart.ko .");
		
		 if( exists $_[1]) {
					@BT_Driver_CMD = ("killall hciattach", "hciconfig hci2 down", "rmmod hci_uart", "insmod hci_uart.ko", "hciattach /dev/ttyUSB$uart_port any -s 3000000 3000000 flow dtron");}
 
		 else{
		    	    @BT_Driver_CMD = ("hciconfig hci2 down", "killall hciattach", "rmmod hci_uart", "insmod hci_uart.ko", "$helper_download", "$fw_download", "$hci_attach");}

    }

    elsif($build_bt_intf =~ /USB/i){
		 
	    $bt_driver_path = "bin_usb$build_chip_value"."_bt"; 
	    @BT_Driver_CMD = ("hciconfig -a hci2 down","rmmod bt8xxx", "insmod bt8xxx.ko");

        my $uname_op= system("uname -a | grep fc18");
        if($uname_op){ 
                    @BT_Driver_CMD = ("hciconfig -a hci2 down","rmmod btusb", "insmod /lib/modules/btusb.ko"); }
        else{
                    @BT_Driver_CMD = ("hciconfig -a hci2 down", "rmmod btusb", "insmod /lib/modules/3.10.11-100.fc18.x86_64/kernel/drivers/bluetooth/btusb.ko");}                   
   }

   chdir("$bt_driver_path");		  ###change directory to where btdrivers are present   
####################################################### 
##As per BT interface, particular section will be executed      
	
   for(my $k=0; $k<=$_[0]; $k++){            ## this loop to load/unload BT multiple times
		foreach my $CMD (@BT_Driver_CMD){ 
			print "\n$CMD\n"; 
			system("$CMD");
			sleep 2;}
	           
	   system("hciconfig hci2 > $output");
	   open (FILE, $output) or die ("\nSystem Failed to open file\n");
	   my (@BT_Device)= <FILE>;
	   close FILE;

LINE: for(my $j=0; $j<=$#BT_Device; $j++){   
	        foreach my $line (@BT_Device){
			     chomp;		 
	             if(($line !~ m/UP/)&&($j >= $#BT_Device)){

				        if($_[0]){ 
								  &monitor_result('error', "BT Load/unload failed at iteration #$k");}
				        else{
			                      print"\n ###BT Load/Unload was Failed..\n";
	                              &monitor_result('BT_Load_Failed');}
	             }elsif($line =~ m/UP/i){
			            system("hciconfig");              
				         print "\n======Loading BT driver Successful=========\n";
	                     system("hciconfig hci2 reset"); 
	        last LINE;   } 
	                }
	          }
	    }  
 }
 
 sub BT_Load_Sanity{

	&Load_Sanity_Conf_File();
	
	my $build_bt_intf = $DEVICE{BUILD_SERVER.'bt_intf'};
	my $build_wlan_intf = $DEVICE{BUILD_SERVER.'wlan_intf'};
	my $output = "output1.txt";
	my $HW = $DEVICE{BUILD_SERVER.'hw'};
	my $build_chip_id = substr $HW, 1, 4;
	my $build_chip_value;
	my ($app_uart_folder,$bin_uart_folder,$fwimage,$build);
	my $bt_driver_path;
	my $uart_port;
	my $DEV = "UUT";
	my $devDriverPath=  "/usr/local/automation";
  
	($build_chip_value,$build_wlanchip_value,$build) = &load_chip_val($build_chip_id, $build_bt_intf);		
    
#	chdir("/root/$build_chip_id/$build"); 
	&Send_System_CMD_Handler_Sanity($DEV, "hciconfig hci2 reset", 0);
#	system("hciconfig hci2 reset");

    if($build_bt_intf =~ /SD/i){
	
		         @BT_Driver_CMD = ("hciconfig hci2 down", "rmmod bt8xxx", "insmod bt$build_chip_value.ko"); 
		         $bt_driver_path = "bin_sd$build_chip_value"."_bt";}      
		         
	elsif($build_bt_intf =~ /UART/i){
		&Send_System_CMD_Handler_Sanity($DEV, "ls /dev/ttyUSB* > $output", 0);
	
#			  system("ls /dev/ttyUSB* > $output"); ### determine UART interface
			  open (FILE, "$output") or &monitor_result('error',"\nSystem Failed to open file \n");
		      while (<FILE>){ 
			        chomp;
		            $_ =~ /USB(\d+)/;
		            $uart_port = $1;  
		         } 
             close FILE;
##########################################
	##Uart folder structure is different for starling and KF

	($build_btchip_value,$app_uart_folder,$bin_uart_folder,$build) = &load_val($build_chip_id, $build_bt_intf);

    $bt_driver_path = "$app_uart_folder/mfguart";

	if($build_chip_value =~ /(8797|8887)/){
					                       
	          $fwimage = "$build_wlan_intf"."$build_chip_value"."_uapsta.bin"; } 
    else { 
              $fwimage = "$build_wlan_intf"."$build_chip_value"."d"."_uapsta.bin";}
					          
##########################################	    

	$helper_download = "./fw_loader_linux /dev/ttyUSB$uart_port 115200 0 helper_uart_3000000.bin";
	$fw_download = "./fw_loader_linux /dev/ttyUSB$uart_port 3000000 1 ../../FwImage/$fwimage";
	$hci_attach = "sh /root/BATS/uart3M.sh $uart_port";
	&Send_System_CMD_Handler_Sanity($DEV, "chmod +x *", 0);
#	system("chmod +x *");
	&Send_System_CMD_Handler_Sanity($DEV, "cp /root/$build_chip_value/$build/$bin_uart_folder/hci_uart.ko .", 0);
#	system("cp /root/$build_chip_value/$build/$bin_uart_folder/hci_uart.ko .");
		
		 if( exists $_[1]) {
					@BT_Driver_CMD = ("killall hciattach", "hciconfig hci2 down", "rmmod hci_uart", "insmod hci_uart.ko", "hciattach /dev/ttyUSB$uart_port any -s 3000000 3000000 flow dtron");}
 
		 else{
		    	    @BT_Driver_CMD = ("hciconfig hci2 down", "killall hciattach", "rmmod hci_uart", "insmod hci_uart.ko", "$helper_download", "$fw_download", "$hci_attach");}

    }

    elsif($build_bt_intf =~ /USB/i){
		 
	    $bt_driver_path = "bin_usb$build_chip_value"."_bt"; 
	    @BT_Driver_CMD = ("hciconfig -a hci2 down","rmmod bt8xxx", "insmod bt8xxx.ko");

        my $uname_op= system("uname -a | grep fc18");
        if($uname_op){ 
                    @BT_Driver_CMD = ("hciconfig -a hci2 down","rmmod btusb", "insmod /lib/modules/btusb.ko"); }
        else{
                    @BT_Driver_CMD = ("hciconfig -a hci2 down", "rmmod btusb", "insmod /lib/modules/3.10.11-100.fc18.x86_64/kernel/drivers/bluetooth/btusb.ko");}                   
   }

#   chdir("$bt_driver_path");		  ###change directory to where btdrivers are present   
####################################################### 
##As per BT interface, particular section will be executed      
	
   for(my $k=0; $k<=$_[0]; $k++){            ## this loop to load/unload BT multiple times
		foreach my $CMD (@BT_Driver_CMD){ 
#			print "\n$CMD\n";
			&Send_System_CMD_Handler_Sanity($DEV, "$CMD", 0); 
#			system("$CMD");
			sleep 2;}
	   
	   &Send_System_CMD_Handler_Sanity($DEV, "hciconfig hci2 > $output", 0);        
#	   system("hciconfig hci2 > $output");
	   open (FILE, $output) or die ("\nSystem Failed to open file\n");
	   my (@BT_Device)= <FILE>;
	   close FILE;

LINE: for(my $j=0; $j<=$#BT_Device; $j++){   
	        foreach my $line (@BT_Device){
			     chomp;		 
	             if(($line !~ m/UP/)&&($j >= $#BT_Device)){

				        if($_[0]){ 
								  &monitor_result('error', "BT Load/unload failed at iteration #$k");}
				        else{
			                      print"\n ###BT Load/Unload was Failed..\n";
	                              &monitor_result('BT_Load_Failed');}
	             }elsif($line =~ m/UP/i){
						&Send_System_CMD_Handler_Sanity($DEV, "hciconfig", 0);
#			            system("hciconfig");              
				         print "\n======Loading BT driver Successful=========\n";
				         &Send_System_CMD_Handler_Sanity($DEV, "hciconfig hci2 reset", 0);
#	                     system("hciconfig hci2 reset"); 
	        last LINE;   } 
	                }
	          }
	    }  
 }
 
####################################################################
sub load_chip_val{
   
	my $P_FILE  = "$localDir/build.tmp";	
	my $build;	
	my @_folder_contents;
	my $build_btchip_value;
	my $build_wlanchip_value;
	my $app_uart_folder;
	my $bin_uart_folder;

	open (FH5, $P_FILE) or print "\nSystem Failed to open file====== \n";
	if (-r $P_FILE){
	       while(<FH5>){
					chomp $_;
     				$build =$_;
					}
				}    
	 close FH5;	
	 &Send_System_CMD_Handler_Sanity($DEV, "ls $localDir/Builds/$build > $localDir/folder_details.txt", 0);	
#	 system("ls $localDir/Builds/$build > $localDir/folder_details.txt"); 
	 open (FH2, "$localDir/folder_details.txt");
	 @_folder_contents = <FH2>;
	 foreach my $line (@_folder_contents){
			   
		  if ($line =~ m/(bin_)(sd|pcie|usb)([0-9a-z]{4})\n/i) {
					$build_wlanchip_value = $3;}
		  else {
					if($_[1] !~ /uart/i){
						     if ($line =~ m/(bin_)(sd|pcie|usb)([0-9a-z]{4})(_bt)/i) {
						             chomp $line;
						             $build_btchip_value = $3;}
					}elsif($_[1] =~ /uart/i){                #### If BT interface is uart it will return folder names and chip id
						
							  if($line =~ /(app_)(uart)(\d+)\w?/) {
									 chomp $line;
									 $app_uart_folder = $line;
									 $build_btchip_value = $3;}      
							  if($line =~ /(bin_bturt|bin_muart)/){
									 chomp $line; 
									 $bin_uart_folder = $line;}     		 		        
					         }
					}	
		 close FH2;		
	 }	
	if($_[1] =~ /uart/i){		
		   	return $build_btchip_value,$app_uart_folder,$bin_uart_folder,$build;} 
    else {
		    return $build_btchip_value,$build_wlanchip_value,$build;}
  }
################################################################################################
sub FW_Driver_Clean_up{

    my @unload = ("ifconfig mlan0 down", "ifconfig uap0 down", "ifconfig uap1 down", "ifconfig wfd0 down", "hciconfig hci2 down", "rmmod bt8xxx", "rmmod sdhci-pci", "modprobe sdhci-pci");
    
    foreach my $cmd (@unload){

#        print"\n$cmd\n";
		&Send_System_CMD_Handler_Sanity($DEV, "$cmd", 0);
#        system("$cmd");
	    sleep 1;
      }		   
}
####################################################################################
