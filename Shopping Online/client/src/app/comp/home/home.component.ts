import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  constructor(private userService: UserService, private router: Router) { }

  alreadyRegistered = true;
  loginErr: any = false;
  cartStatus: string;
  reg_btn_val: string = "NEXT STEP";
  valid: boolean = false;
  userDetails: any = [];
  selector: string = "Select City";
  submitted: boolean = false;
  userFetchedDetails: any;
  error_ID: string = null;
  error_UN: string = null;
  DupErrID: string = null;
  DupErrUN: string = null;
  cartCreationDate: string;
  orderCreationDate: string;
  totalAmountOfProducts: number;
  totalAmountOfOrders: number = null;
  openCartPrice: number = null;
  loadingComplete: boolean = false;
  interval:any;
  destroyed:boolean = false;

  isRegistered(): void {
    this.submitted = false;
    this.alreadyRegistered = !this.alreadyRegistered
  }

  //--------------------Register--------------------------

  registerForm_step1: FormGroup = new FormGroup({

    userName: new FormControl(null, [Validators.required, Validators.minLength(6)]),
    email: new FormControl(null, [Validators.email, Validators.required]),
    ID: new FormControl(null, [Validators.required, Validators.min(99999)]),

    choosePassword: new FormControl(null, [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl(null, [Validators.required, Validators.minLength(6)])
  }
  );

  registerForm_step2: FormGroup = new FormGroup({

    firstName: new FormControl(null, [Validators.required]),
    lastName: new FormControl(null, [Validators.required]),
    city: new FormControl(null, [Validators.required]),
    street: new FormControl(null, [Validators.required]),
    houseNumber: new FormControl(null, [Validators.required]),
    aptNumber: new FormControl(null, [Validators.required])

  });

  get f(): any { return this.registerForm_step1.controls; }
  get f2(): any { return this.registerForm_step2.controls; }


  register(): void | undefined {

    this.submitted = true;
    if (this.reg_btn_val === "NEXT STEP") {
      if (!this.registerForm_step1.valid || (this.registerForm_step1.controls.choosePassword.value != this.registerForm_step1.controls.confirmPassword.value)) {
        return;
      }
      this.userService.getAllUsers(this.registerForm_step1.value).subscribe(data => {

        if (data.idDuped) {
          this.error_ID = "This ID already exists";
          this.valid = false;
          this.reg_btn_val = "NEXT STEP";
          this.DupErrID = this.registerForm_step1.controls.ID.value

        }
        if (data.userNameDuped) {
          this.error_UN = "User name already exists";
          this.valid = false;
          this.reg_btn_val = "NEXT STEP";
          this.DupErrUN = this.registerForm_step1.controls.userName.value
        }
        if (!data.idDuped && !data.userNameDuped) {
          this.valid = true;
          this.reg_btn_val = "REGISTER";
          this.submitted = false;
        }
      });

    }

    if (this.reg_btn_val === "REGISTER" && this.registerForm_step1.valid) {

      if (!this.registerForm_step2.valid) {
        return;
      }

      this.userDetails = Object.assign(this.registerForm_step1.value, this.registerForm_step2.value)

      this.userService.register(this.userDetails).subscribe(data => {

        this.userFetchedDetails = data;
        this.userService.auth(this.userFetchedDetails);
        this.searchCart();
      })
    }

  }

  //----------------------Login--------------------------

  get f3(): any { return this.loginForm.controls; }


  loginForm: FormGroup = new FormGroup({
    userName: new FormControl(null, [Validators.required]),
    password: new FormControl(null, [Validators.required]),
  });

  login(): void | undefined {
    this.submitted = true;
    this.loadingComplete = false;
    if (!this.loginForm.valid) {
      this.loadingComplete = true;
      return;
    }
    this.userService.getAllUsers(this.loginForm.value).subscribe(data => {
      if (this.loginForm.controls.userName.value === data.userName && this.loginForm.controls.password.value === data.password) {
        this.loginErr = false;
        this.userFetchedDetails = data;
        this.userService.auth(this.userFetchedDetails);
        this.searchCart();
        if (data.role === "admin") {
          this.openShop()
        }
      }
      else {
        this.loginErr = this.f3.password.value;
        this.loadingComplete = true;
      }
    });
  }

  searchCart(): void {
    this.userService.searchCart(this.userFetchedDetails._id).subscribe(data => {
      this.cartCreationDate = null;
      if (data) {
        this.cartStatus = "Continue Shopping";
        this.cartCreationDate = data.creationDate.split(" ")[1].
          concat(" " + data.creationDate.split(" ")[2].
            concat("th " + data.creationDate.split(" ")[3].
              concat(" - " + data.creationDate.split(" ")[4])))

        this.userService.searchUserProducts(data._id).subscribe(data2 => {
          if (data2.length > 0) {
            for (var i: number = 0; i < data2.length; i++) {
              this.openCartPrice += data2[i]["totalPrice"]
            }
            this.openCartPrice = parseFloat(this.openCartPrice.toFixed(2));
            if (data2.length === i) {
              this.loadingComplete = true;
            }
          }
        })
      }
      else {
        this.cartStatus = "Start Shopping";
        this.loadingComplete = true;
      }
    });
    this.searchOrder();
  }

  searchOrder(): (void | number) {
    this.userService.searchOrder(this.userFetchedDetails._id).subscribe(data => {
      if (data.length === 0) {
        this.orderCreationDate = null;
      }
      else {
        this.orderCreationDate = data.sort(function compare(a, b) {
          if (Date.parse(a.generated) > Date.parse(b.generated)) {
            return -1;
          }
          if (a.last_nom < b.last_nom) {
            return 1;
          }
          return 0;
        })[0].generated;

        this.orderCreationDate = this.orderCreationDate.split(" ")[1].
          concat(" " + this.orderCreationDate.split(" ")[2].
            concat("th " + this.orderCreationDate.split(" ")[3].
              concat(" - " + this.orderCreationDate.split(" ")[4])));
      }
    })
  }

  //----------------------End of login--------------------

  //----------------------Start Shopping--------------------

  openShop(): void {
    this.interval = setInterval(() => {
      this.loadingComplete = false;
      this.router.navigate(['shop']);
      if(this.destroyed){
        clearInterval(this.interval);
      }
    }, 200);
    
  }

  //----------------------End of shopping--------------------
  onResize(){
    if(window.outerWidth < 401){
      (document.getElementsByTagName("body") as HTMLCollectionOf<HTMLBodyElement>)[0].style.display = "table";
      (document.getElementsByTagName("html") as HTMLCollectionOf<HTMLHtmlElement>)[0].style.display = "table";
    }
    else{ 
    (document.getElementsByTagName("body") as HTMLCollectionOf<HTMLBodyElement>)[0].style.display = "block";
    (document.getElementsByTagName("html") as HTMLCollectionOf<HTMLHtmlElement>)[0].style.display = "block";
  }
  }

  ngOnInit(): void {
    this.onResize()
    this.userService.checkSession().subscribe(data => {
      if (data.user) {
        this.userFetchedDetails = data.user;
        this.searchCart()
      }
      if (this.userFetchedDetails) {
        this.userService.auth(this.userFetchedDetails)
        if (data.user.role === "admin") {
          this.openShop()
        }
      };
    });
    this.userService.getProducts().subscribe(data => {
      this.totalAmountOfProducts = data.length;
    });
    this.userService.getOrders().subscribe(data => {
      if (data.length > 0) {
        this.totalAmountOfOrders = data.length;
      }
    });
    var loadCondition = () => {
      if (this.totalAmountOfOrders && this.totalAmountOfProducts) {
        this.loadingComplete = true;
      }
      else setTimeout(() => {
        loadCondition();
      }, 100);
    }
    loadCondition();
  }

  ngOnDestroy(){
    this.destroyed = true;
    (document.getElementsByTagName("body") as HTMLCollectionOf<HTMLBodyElement>)[0].style.display = "block";
    (document.getElementsByTagName("html") as HTMLCollectionOf<HTMLHtmlElement>)[0].style.display = "block";
  }
}
